import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import asyncio
from google.antigravity import Agent, LocalAgentConfig

app = FastAPI()

class ImageRequest(BaseModel):
    prompt: str

@app.post("/generate-image")
async def generate_image(req: ImageRequest):
    try:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set")
            
        config = LocalAgentConfig(
            vertex=True,
            api_key=api_key,
            system_instructions="You are an AI assistant specialized in generating and handling visual assets."
        )
        
        async with Agent(config) as agent:
            response = await agent.chat(f"Generate an image of this exact description: {req.prompt}")
            text_result = await response.text()
            return {"result": text_result}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
