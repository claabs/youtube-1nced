# youtube-1nced

Sends "1" (or any desired random message) in a desired YouTube live stream chat every so often.

## Usage

1. Create a GCP project, and create an OAuth2 app (see: <https://github.com/googleapis/google-api-nodejs-client#oauth2-client>)

1. Create a `config.json` in a mountable folder.

    ```json
    {
        "channelId": "UCxWQPd1ye3XKKo1QAhMoNUg",
        "messageSchedule": "*/5 * * * *",
        "clientId": "000000000000-abc123abc123abc123abc123.apps.googleusercontent.com",
        "clientSecret": "abc123abc123abc123abc123abc123abc123",
        "redirectUrl": "http://localhost:6222/callback",
        "messageExp": "[0-9a-f]{1,5}"
    }
    ```

1. Run the container

    ```shell
    docker run -v your/local/path/config:/usr/app/config -p 6222:6222 ghcr.io/claabs/youtube-1nced:latest
    ```
