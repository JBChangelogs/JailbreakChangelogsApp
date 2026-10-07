# OCR models

Used by the trade screenshot scanner (`src/main/ocrWorker.ts`).

| File | Source |
| --- | --- |
| `det.onnx` | PaddleOCR PP-OCRv3 text detection, ONNX export from [monkt/paddleocr-onnx](https://huggingface.co/monkt/paddleocr-onnx) (`detection/v3/det.onnx`) |
| `rec.onnx` | PaddleOCR English text recognition, same source (`languages/english/rec.onnx`) |
| `dict.txt` | Character dictionary for `rec.onnx`, same source (`languages/english/dict.txt`) |

PaddleOCR models are © PaddlePaddle Authors, licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0). These files are redistributed unmodified.
