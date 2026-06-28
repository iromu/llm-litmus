

## harness qwen settings

```json
{
  "modelProviders": {
    "openai": [
      {
        "id": "Qwen3.6-35B-A3B",
        "name": "Qwen3.6-35B-A3B",
        "baseUrl": "http://spark.local:4000/v1",
        "generationConfig": {
          "timeout": 900000,
          "contextWindowSize": 262144,
          "reasoning_effort": "low",
          "reasoning": {
            "effort": "low"
          },
          "samplingParams": {
            "max_tokens": 32768
          }
        }
      },
      {
        "id": "deepseek-v4-flash",
        "name": "DeepSeek V4 Flash",
        "baseUrl": "http://spark.local:4000/v1",
        "generationConfig": {
          "timeout": 900000,
          "contextWindowSize": 100000,
          "reasoning_effort": "low",
          "reasoning": {
            "effort": "low"
          },
          "samplingParams": {
            "max_tokens": 384000
          }
        }
      }
    ]
  }
}
```
