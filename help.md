const url = 'https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3-medium';
const options = {
  method: 'POST',
  headers: {
    accept: 'application/json',
    'content-type': 'application/json',
    authorization: 'Bearer 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'
  },
  body: JSON.stringify({
    aspect_ratio: '1:1',
    cfg_scale: 5,
    mode: 'text-to-image',
    model: 'sd3',
    output_format: 'jpeg',
    seed: 0,
    steps: 50,
    negative_prompt: 'string',
    prompt: 'horse on dog'
  })
};

fetch(url, options)
  .then(res => res.json())
  .then(json => console.log(json))
  .catch(err => console.error(err));