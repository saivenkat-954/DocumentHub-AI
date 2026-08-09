import os

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


def generate_answer(question: str, context: str) -> str:
    prompt = f"""
Context:
{context}

Question:
{question}
"""

    response = client.models.generate_content(
        model="gemini-3.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=(
                "You are a document question-answering assistant. "
                "Answer the user's question using only the provided context. "
                "If the answer is not present in the context, say "
                "'I could not find the answer in the document.' "
                "Do not invent information."
            )
        )
    )

    return response.text