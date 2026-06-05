# My AI Development Notes & Workflow (AGENTS.md)

Hey! I wanted to write down how I used AI to build this project, where it helped me, and the parts where I had to step in and fix things myself. Since I'm a junior engineer, I used a mix of LLMs (Gemini, Groq, and coding assistants) to get this done, and it was a pretty wild ride getting the OCR and validations to work correctly.

---

## 🛠️ AI Tools I Used

1. **Google Gemini 1.5 Flash (for OCR & Extraction)**:
   - I used this model specifically for reading the uploaded images and PDFs. Gemini's vision is really good at reading handwritten text, which is exactly what manufacturing sheets have. It returns the data as JSON with confidence levels for each field.
2. **Groq (Llama-3.3-70b-versatile)**:
   - I used Groq's API because it is incredibly fast. Originally, I tried using Llama for both validation and anomaly detection, and also for the AI Chat tab where you can ask questions about the logs in plain English.
3. **AI Coding Assistants**:
   - I used AI to help me quickly scaffold the FastAPI backend and structure the React frontend pages, especially writing the pure CSS for the futuristic dark HUD styling since I'm not a designer.

---

## 💡 How I Used AI & My Prompting Workflow

I started by giving the AI assistants the layout of the manufacturing sheets and asking them to generate a schema. 
- For the OCR extraction, my prompt in `gemini_service.py` is pretty detailed. I tell Gemini to look at the table rows, extract specific fields (`date`, `shift`, `employee_number`, `operation_code`, `machine_number`, `work_order_number`, `quantity_produced`, `time_taken`), and output them as a strict JSON object with a self-reported confidence score between 0.0 and 1.0.
- For the AI Chat, I feed the last 100 database records as context to Llama on Groq so the user can query it naturally (like asking: *"Show shift II failures this week"*).

---

## 🐛 Debugging Challenges & Where the AI Failed

This is where things got really messy and I had to spend a lot of time debugging and writing manual code:

### 1. The Groq AI Validation Nightmare (False Positives)
Initially, the project used Groq AI to check if the extracted records had validation errors. But it was super unreliable:
- It kept hallucinating! For example, it would look at a perfectly valid quantity like `10` and output a validation error: *"Invalid quantity '10', must be between 1 and 10000"*.
- When we changed the shift names from `A`, `B`, `C` to Roman numerals `I`, `II`, `III` (which is what the shop floors actually use), the AI validator kept throwing errors saying *"shift must be A/B/C"*.
- **My Fix**: I ended up completely removing the Groq AI from the validation error list pipeline. AI is just too unpredictable for strict data validation. Instead, I wrote a deterministic Python rules engine in `validation_service.py` to handle all errors (checking shifts, dates, duplicate work orders in MongoDB, etc.). I only kept Groq for anomaly warnings and chat.

### 2. Missing Year in Handwritten Dates (Date Context Propagation)
The handwriting on the logs is often lazy. The first row has a full date like `22/4/26` (meaning April 22, 2026), but the next rows just say `22/4`.
- The OCR extracted `22/4` literally. But our date validator failed it because it was missing a year.
- **My Fix**: I wrote a custom python script in the backend `extraction.py` that loops through the extracted rows. If it finds a partial date like `22/4`, it automatically looks up the column or checks the raw text for the year (e.g. `26`) and propagates it so the date becomes `22/4/26`. If no year is found anywhere on the page, it defaults to the current year (`26`).

### 3. OCR Dash Misreads (Quantity `-1`)
Handwritten sheets often have a dash `—` or `nil` in the "Qty Produced" column if nothing was made.
- Gemini's OCR kept misreading these dashes as `-1` (negative one).
- This triggered validation errors saying the quantity cannot be negative.
- **My Fix**: I wrote a helper function `_clean_quantity` in `extraction.py` to intercept quantities that OCR read as `-1` or dashes, and normalize them to `None` (intentionally blank) so the user doesn't get annoying error flags.

---

## 🧠 What I Learned & AI vs Manual Balance

- **AI is awesome for**: vision tasks (like reading handwriting) and brainstorming code layouts. It also saved me so much time writing CSS styles and set up the uvicorn/Vite server scripts.
- **Manual code is required for**: strict business logic and data cleaning. If you let AI do strict validations, it will hallucinate and make your app look broken. Programmatic post-processing (like my date propagation code) is way more reliable than trying to get the AI to guess the year in the prompt.
- **Database Migrations**: When my new validation rules were done, the database still had a lot of old garbage validation errors. I had to manually write and run a script `revalidate_existing.py` to clean up the MongoDB collections.
