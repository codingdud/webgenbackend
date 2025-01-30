# WebGenBackend

This is the backend service for the WebGen project, built with Deno.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Contributing](#contributing)
- [License](#license)

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/codingdud/WebGenBackend.git
    ```
2. Navigate to the project directory:
    ```sh
    cd WebGenBackend
    ```
3. Install the dependencies:
    ```sh
    deno cache deps.ts
    ```

## Usage

1. Start the development server:
    ```sh
    deno run --allow-net --allow-env --allow-read --allow-sys --watch src/app.ts
    ```
    ```sh
    deno run --allow-net --allow-read mod.ts
    ```
2. The server will be running at `http://localhost:5000`.

## API Endpoints

### Authentication

- `POST /api/v1/auth/signup` - Sign up a new user.
    - **Headers**: `Authorization: Bearer {{token}}`
    - **Body** (JSON):
        ```json
        {
            "email": "user@example.com",
            "password": "password"
        }
        ```

- `POST /api/v1/auth/signin` - Sign in an existing user.
    - **Headers**: `Authorization: Bearer {{token}}`
    - **Body** (JSON):
        ```json
        {
            "email": "admin@gmail.com",
            "password": "password"
        }
        ```

- `GET /api/v1/auth/refresh-token` - Refresh the authentication token.
    - **Headers**: `Authorization: Bearer {{token}}`

- `POST /api/v1/auth/reset-api-key` - Reset the API key.
    - **Headers**: `Authorization: Bearer {{token}}`

### Projects

- `POST /api/v1/project` - Create a new project.
    - **Headers**: `Authorization: Bearer {{token}}`
    - **Body** (JSON):
        ```json
        {
            "title": "title",
            "description": "description",
            "tags": ["tag"]
        }
        ```

- `GET /api/v1/project` - Get a list of projects.
    - **Headers**: `Authorization: Bearer {{token}}`
    - **Params**:
        - `page`: 2

- `GET /api/v1/project/:id` - Get a project by ID.
    - **Headers**: `Authorization: Bearer {{token}}`

- `PUT /api/v1/project/:id` - Update a project.
    - **Headers**: `Authorization: Bearer {{token}}`
    - **Body** (JSON):
        ```json
        {
            "title": "Emeri zan",
            "description": "nudalagai",
            "tags": ["tag", "tug"],
            "status": "in-progress"
        }
        ```

- `DELETE /api/v1/project/:id` - Delete a project.
    - **Headers**: `Authorization: Bearer {{token}}`
    - **Body** (JSON):
        ```json
        {
            "title": "meri zan",
            "description": "udalagai",
            "tags": ["tag", "tug"],
            "status": "in-progress"
        }
        ```

### Image Generation

- `POST /api/v1/imageGen` - Generate an image.
    - **Headers**: `Authorization: Bearer {{token}}`
    - **Body** (JSON):
        ```json
        {
            "style": "minimalist",
            "colorscheme": ["red", "green"],
            "prompt": "beautiful Cinderella in kitchen washing cloth",
            "type": "header",
            "aspect_ratio": "1:1",
            "output_format": "jpeg",
            "negative_prompt": ""
        }
        ```

## Contributing

1. Fork the repository.
2. Create a new branch:
    ```sh
    git checkout -b feature-branch
    ```
3. Make your changes and commit them:
    ```sh
    git commit -m "Description of changes"
    ```
4. Push to the branch:
    ```sh
    git push origin feature-branch
    ```
5. Open a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.