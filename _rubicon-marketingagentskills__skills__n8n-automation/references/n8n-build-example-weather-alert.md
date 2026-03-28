# n8n Build Example: Daily Weather Rain Alert

## Build Brief

**Objective:** Every morning at 7:00 AM (Africa/Lagos), fetch today's forecast and email you only if rain is likely.

**Trigger:** Schedule (daily).

**Inputs:** Latitude, longitude, rain threshold (example: 50%), email provider details (example: Resend API key).

**Outputs:** One email alert on "rain likely", otherwise no message (or an optional "all clear" email).

---

## Workflow Blueprint (Nodes in Order)

1. **Schedule Trigger** (daily, 07:00)
2. **HTTP Request** – Get Forecast (Open-Meteo)
3. **Set** – Shape Today's Values (pull out today's rain probability and date)
4. **IF** – Rain likely? (probability >= threshold)
5. **HTTP Request** – Send Email (Resend) (true path)
6. *(Optional)* NoOp / Set on false path, or a second email node for "no rain"

---

## Build Steps in n8n (Click by Click)

### 1) Schedule Trigger

1. Add node: **Schedule Trigger**
2. Configure: **Every day**
3. Time: **07:00**
4. Timezone: **Africa/Lagos** (match your instance timezone)

### 2) HTTP Request: "Get Forecast (Open-Meteo)"

1. Add node: **HTTP Request**
2. Name: **Get Forecast**
3. Method: **GET**
4. URL (example, replace lat/lon):
   ```
   https://api.open-meteo.com/v1/forecast?latitude=6.6082746&longitude=3.3052691&daily=precipitation_probability_max,precipitation_sum&timezone=Africa%2FLagos
   ```
5. Leave auth off (Open-Meteo is free for this endpoint).
6. Execute the node once. You should see a response with a `daily` object containing arrays like `precipitation_probability_max` and `time`.

### 3) Set Node: "Today's Rain Data"

This makes the IF node simple and readable.

1. Add node: **Set**
2. Name: **Today's Rain Data**
3. Add fields:
   - `date` (String):
     - Value: `={{$json.daily.time[0]}}`
   - `rainProbability` (Number):
     - Value: `={{$json.daily.precipitation_probability_max[0]}}`
   - `precipSum` (Number, optional):
     - Value: `={{$json.daily.precipitation_sum[0]}}`

### 4) IF Node: "Rain likely?"

1. Add node: **IF**
2. Name: **Rain likely?**
3. Condition (example):
   - Left value: `={{$json.rainProbability}}`
   - Operation: **Larger or equal**
   - Right value: `50`
4. True output means "email alert".

### 5) Email Alert (Resend via HTTP Request)

1. Add node: **HTTP Request**
2. Name: **Send Rain Email (Resend)**
3. Method: **POST**
4. URL: `https://api.resend.com/emails`
5. Turn on **Send Headers** and add:
   - `Authorization`: `Bearer YOUR_RESEND_API_KEY`
   - `Content-Type`: `application/json`
6. Turn on **Send Body** and add body parameters:
   - `from`: your-email@domain.com
   - `to`: recipient@email.com
   - `subject`: `Rain alert for {{$json.date}}`
   - `text`: `={{"Rain chance today is " + $json.rainProbability + "%. Take an umbrella!"}}`

### 6) False Branch (Do Nothing)

Leave the **false** output unconnected, or add a **Set** node that writes a log message like "No rain today".

#### Option B: Send a "No rain" Email (Recommended While Testing)

1. Add another **HTTP Request** node.
2. Name: **Send No Rain Email (Resend)**
3. Connect the **False** output of the IF node to this node.

**Settings for the false branch email node:**

- Method: **POST**
- URL: `https://api.resend.com/emails`
- Send Headers:
  - `Authorization`: `Bearer YOUR_RESEND_API_KEY`
  - `Content-Type`: `application/json`
- Send Body (JSON):
  - `from`: your-email@domain.com
  - `to`: recipient@email.com
  - `subject`: `={{"No rain expected for " + $json.date}}`
  - `text`: `={{"No rain expected today. Rain chance is " + $json.rainProbability + "%."}}`

---

## Data Shape You Are Relying On (Mental Model)

Open-Meteo returns an **object** with a `daily` **object**, and inside that are **arrays** for each daily metric. In n8n, you're reading "today" as index `[0]`.

---

## Reliability and Operations

- Add an **Error Workflow** (with Error Trigger) that emails you when this workflow fails, so silent failures do not slip by.
- In the Weather HTTP node, keep an eye on the **Executions** list to confirm the response still includes `daily` fields.
- If email sending can fail sometimes, consider a simple retry path: **Wait 30s → resend once** (only on the email node failure).

---

## Security Checklist

- Store your Resend API key in **n8n Credentials** (or environment variables), not inside the node long term.
- If you self host, keep HTTPS working and confirm your instance timezone is set correctly so 7:00 AM fires as expected.

---

## Optional Upgrades

1. Add a second condition: alert if `precipSum > 0` even when probability is low.
2. Add "quiet hours" (skip weekends, or only send alerts Mon to Fri).
3. Add a simple location label in the email subject (city name you set once).
4. Add a fallback provider (SMTP node) if Resend fails.
