 const { GoogleGenerativeAI } = require("@google/generative-ai");

    // This reads the secret API key you set in the Netlify dashboard.
    const API_KEY = process.env.GEMINI_API_KEY;

    // This will cause an error if the API key is not set in Netlify, which is a good safety check.
    if (!API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable not set.");
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // This is the main function that Netlify will run. It MUST be exported like this.
    exports.handler = async function (event, context) {
      // These headers allow your website to talk to this function.
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      };

      // This part handles a technical requirement for browsers called CORS.
      if (event.httpMethod === 'OPTIONS') {
        return {
          statusCode: 204,
          headers
        };
      }

      // It only allows POST requests, which is more secure.
      if (event.httpMethod !== 'POST') {
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method Not Allowed' })
        };
      }

      try {
        // Get the user's message from the request.
        const { message } = JSON.parse(event.body);

        if (!message) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Message is required' })
          };
        }
        
        // Start a chat with the AI, giving it its initial instructions.
        const chat = model.startChat({
            history: [
              {
                role: "user",
                parts: [{ text: "You are a friendly and professional AI assistant for Ehsan (Sani) Mohajer, an expert in Project Management and AI. Your goal is to help potential clients understand his skills and encourage them to book a consultation. Keep your answers concise and helpful." }],
              },
              {
                role: "model",
                parts: [{ text: "Understood. I am Ehsan (Sani) Mohajer's AI assistant. I will act as a friendly and professional guide for potential clients, keeping my responses concise and helpful to encourage them to connect with him." }],
              },
            ],
            generationConfig: {
              maxOutputTokens: 200,
            },
        });

        // Send the user's message to the AI and get the result.
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        // Send the AI's reply back to your website.
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ reply: text }),
        };

      } catch (error) {
        console.error("Error in Netlify function:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to get response from AI' }),
        };
      }
    };
    
