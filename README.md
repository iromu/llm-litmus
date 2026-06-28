# What is this?

"One shot" prompts, with skills support. When the resualt does not work at all, error logs are passed "as is" to
autocorrect.

## Why adding skills?

This levels the different models knowledge cutoff dates. We are testing the understanding and execution of the task

## The results

| Test      | Model             | Link                                                                                                                     | Comments                                                                  | Bug fix iterations |
|-----------|-------------------|--------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------|--------------------|
| CityPulse | deepseek-v4-flash | https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/deepseek-v4-flash/CityPulse/index.html | No collisions, only camera<br/>Minimal compass<br/>No prompt to talk<br/> | 2                  |
| CityPulse | Qwen3.6-35B-A3B   | https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/Qwen3.6-35B-A3B/CityPulse/index.html   | No collisions <br/>Compass not working                                    | ?                  |
| Tetris    | deepseek-v4-flash | https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/deepseek-v4-flash/Tetris/index.html    | Working                                                                   | 0                  |
| Tetris    | Qwen3.6-35B-A3B   | https://html-preview.github.io/?url=https://github.com/iromu/llm-litmus/blob/main/Qwen3.6-35B-A3B/Tetris/index.html      | No Game Over screen                                                       | 0                  |



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
