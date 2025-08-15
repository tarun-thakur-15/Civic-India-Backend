const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyArnNNwCmhVBcCybO29yKpb3-1YurzxqrI");

const generateSummary = async (articleText) => {
  try {
    const model = genAI.getGenerativeModel({
      model: "models/gemini-1.5-pro", // required full path for v1
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024, // optional: limits response length
      },
    });

    const prompt = `
You are an expert news summarizer.
Summarize the following news article into a clear, detailed summary:

"${articleText}"

Use a friendly tone and human-like sentence structure. Avoid bullet points.
    `;

    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
    });

    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API error:", error.message || error);
    return null;
  }
};

module.exports = generateSummary;
