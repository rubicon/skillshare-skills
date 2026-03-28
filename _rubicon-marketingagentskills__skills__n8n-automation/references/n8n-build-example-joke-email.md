# n8n Build Example: Joke Email Workflow

## Build Brief

**Objective:** Fetch a random joke from icanhazdadjoke.com and email it via Resend.

**Trigger:** Schedule Trigger every 5 minutes.

**Inputs:** Resend API key, from email, to email.

**Outputs:** An email sent with the joke in the body.

**Assumptions:** You are running n8n with timezone set correctly (Africa/Lagos is fine).

---

## Workflow Blueprint (Node Order)

1. **Schedule Trigger** - Runs every 5 minutes.
2. **Fetch Joke (HTTP Request)** - GET `https://icanhazdadjoke.com/` with header `Accept: application/json` so the response includes a `joke` field.
3. **Send Email (Resend HTTP Request)** - POST `https://api.resend.com/emails` with JSON body including `from`, `to`, `subject`, `text` (mapped from the prior node).

---

## Build Steps in n8n (Click by Click)

### 1) Schedule Trigger

1. Add node: **Schedule Trigger**
2. Mode: **Every X**
3. Set: **5 minutes**
4. Save.

### 2) Fetch Joke (HTTP Request)

1. Add node: **HTTP Request**
2. Name it: **Fetch Joke**
3. Method: **GET**
4. URL: `https://icanhazdadjoke.com/`
5. Headers:
   - Name: `Accept`
   - Value: `application/json`
6. Execute this node once and confirm output has a field like:
   - `joke: "..."`

### 3) Send Email (Resend HTTP Request)

1. Add node: **HTTP Request**
2. Name it: **Send Email (Resend)**
3. Method: **POST**
4. URL: `https://api.resend.com/emails`
5. Headers:
   - `Authorization` = `Bearer YOUR_RESEND_API_KEY`
   - `Content-Type` = `application/json`
6. Body Content Type: **JSON**
7. Body (JSON):
   - `from`: your-email@domain.com
   - `to`: recipient@email.com
   - `subject`: Dry Jokes
   - `text`: `{{$json.joke}}`
8. Execute workflow to test, then activate it.

---

## Ready to Import Workflow JSON

Paste this into **Workflow → Import from File / Clipboard** (edit placeholders for your API key and emails):

```json
{
  "name": "Fetch a random joke from icanhazdadjoke.com and email it via Resend",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "minutes",
              "value": 5
            }
          ]
        }
      },
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.3,
      "position": [0, 0],
      "id": "1241b016-3427-4372-801b-69fbd34b5bcd",
      "name": "Schedule Trigger",
      "notesInFlow": true,
      "notes": "Runs every 5 minutes."
    },
    {
      "parameters": {
        "url": "https://icanhazdadjoke.com/",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Accept",
              "value": "application/json"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.3,
      "position": [208, 0],
      "id": "1cdacbec-a054-4752-b53c-d20f7efd7f57",
      "name": "HTTP Request",
      "notes": "Fetch Joke (HTTP Request)"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.resend.com/emails",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "Bearer YOUR_RESEND_API_KEY"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "from",
              "value": "your-email@domain.com"
            },
            {
              "name": "to",
              "value": "recipient@email.com"
            },
            {
              "name": "subject",
              "value": "Dry Jokes"
            },
            {
              "name": "text",
              "value": "={{$json.joke}}"
            }
          ]
        },
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.3,
      "position": [416, 0],
      "id": "db173176-36e9-4cfd-95f9-2c26b24a34d1",
      "name": "HTTP Request1",
      "notes": "Send Email (Resend HTTP Request)"
    }
  ],
  "pinData": {},
  "connections": {
    "Schedule Trigger": {
      "main": [
        [
          {
            "node": "HTTP Request",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "HTTP Request": {
      "main": [
        [
          {
            "node": "HTTP Request1",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": false,
  "settings": {
    "executionOrder": "v1",
    "availableInMCP": false
  }
}
```

---

## Reliability and Operations

- **Avoid silent failures:** Create a separate Error Workflow using the Error Trigger node that emails you (or pings Slack) when this workflow fails.
- **Retry behavior:** If Resend occasionally fails, turn on Continue On Fail for the Resend node and branch to a "Wait 30s → retry once" path (simple backoff).
- **Check executions:** Watch the Executions list for failures and confirm the output includes `joke`.

---

## Security Checklist (Important for Production)

- Do not hardcode your Resend key long term. Store it in **n8n Credentials** (HTTP Header Auth style) and reference the credential in the HTTP Request node.
- Keep sender domains verified in Resend, use a real "from" that Resend allows.
- If you later expose anything via webhook, treat the URL as secret and validate incoming requests.

---

## Optional Upgrades

1. **Add a Set node** before Resend to format a nicer email like:
   - Subject: `Daily Dad Joke`
   - Text: `Here you go:\n\n{{$json.joke}}`
2. **Deduplicate jokes** (store last joke in Data Store / static data, skip if same).
3. **HTML email** (use `html` field instead of `text` in Resend payload).
4. **Send only during certain hours** (IF node checking hour in Africa/Lagos).
