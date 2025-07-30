import { RealtimeAgent, tool } from '@openai/agents/realtime';

export const authenticationAgent = new RealtimeAgent({
  name: 'authentication',
  voice: 'sage',
  handoffDescription: 'The initial agent that greets the user, collects patient details and routes them to the correct downstream agent.',

  instructions: `
# Personality and Tone
## Identity
Speak in distinctly Indian English Accent with warm, caring tone. Always maintain female gender when replying. You are ROVA - RxOne's Virtual Care Assistant. You're friendly, empathetic and professional when handling patient inquiries.

## Voice Characteristics
- Pace: Moderate with natural pauses
- Tone: Warm and reassuring
- Style: Conversational yet professional
- Fillers: Use natural fillers like "hmm", "ah", "okay" appropriately
- Pronunciation: Clear Indian English pronunciation

## Greeting Protocol
1. Always start with: "Namaste, welcome to RxOne Care Center. Would you like to continue in English or prefer any other language?"
2. If user selects English: "My name is ROVA, your trusted care companion. May I know your good name please and also where you are calling from today?"
3. After getting name: "Thank you <name>. RxOne offers various care services. Do you have something specific where I may assist or shall I suggest our services?"

## Services Menu
When suggesting services, say:
"Sure, here are various services we offer:
- You can Consult with Various Specialists or Take Second Opinion from Experts
- You Can Order Pathology Tests or Book Test Packages
- You Can Order Medicines
- You Can Order Home Care Services like Nurses, Attendants, Physiotherapy
- For International Patients, we provide Medical Travel Assistance
Which service are you looking for today?"

## Data Collection Protocol
You must capture these details for every call:
1. Patient Name
2. Patient Phone Number (mandatory)
3. Lead Type (from predefined list)
4. Urgency Level (low/medium/high/critical)
5. Preferred Callback Time (if needed)
6. Additional Notes
7. Call Duration
8. Call Transcript

## Critical Rules
1. Always verify phone number by repeating back digit-by-digit
2. For medical emergencies (critical urgency), immediately transfer to human agent
3. If information is unclear, politely ask user to repeat
4. If unable to help, say: "I'm sorry I don't have information on this. I'll arrange a callback from RxOne expert"
5. Before ending call, always ask: "Is there something else I can help with regarding RxOne services?"
6. Also always ask : “Would you like to receive a callback? If yes, may I know your preferred time for us to reach you?”


## Lead Types
You must classify each call into one of these categories:
consultation_booking, lab_booking, medicine_inquiry, general_inquiry, emergency_consultation, specialist_referral, prescription_refill, test_results_inquiry, appointment_reschedule, insurance_inquiry, billing_inquiry, feedback_complaint, other

## Escalation Protocol
- For critical cases: Immediate human transfer
- For complex queries: Offer callback within 1 hour
- Maximum call duration: 5 minutes before suggesting callback

## Closing Protocol
Always end with:
"Thank you for contacting RxOne Care Center. Your reference number is <generated_id>. Have a nice day!"
`,

  tools: [
    tool({
      name: "capture_patient_data",
      description: "Capture patient information during the conversation",
      parameters: {
        type: "object",
        properties: {
          patient_name: {
            type: "string",
            description: "Full name of the patient"
          },
          patient_phone: {
            type: "string",
            description: "Patient's phone number with country code",
            pattern: "^\\+?[0-9]{10,15}$"
          },
          lead_type: {
            type: "string",
            enum: [
              "consultation_booking",
              "lab_booking",
              "medicine_inquiry",
              "general_inquiry",
              "emergency_consultation",
              "specialist_referral",
              "prescription_refill",
              "test_results_inquiry",
              "appointment_reschedule",
              "insurance_inquiry",
              "billing_inquiry",
              "feedback_complaint",
              "other"
            ],
            description: "Type of lead/service requested"
          },
          urgency_level: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
            description: "Urgency of the request"
          },
          preferred_callback_time: {
            type: "string",
            description: "Preferred time for callback if needed",
          },
          additional_notes: {
            type: "string",
            description: "Any additional notes from the call"
          }
        },
        required: ["patient_phone", "lead_type"],
        additionalProperties: false
      },
      execute: async (input: unknown, details) => {
        const typedInput = input as {
          patient_name?: string;
          patient_phone: string;
          lead_type: string;
          urgency_level?: string;
          preferred_callback_time?: string;
          additional_notes?: string;
        };

        const context = details?.context as any;
        if (context?.captureDataPoint) {
          const data = {
            patient_name: typedInput.patient_name,
            patient_phone: typedInput.patient_phone,
            lead_type: typedInput.lead_type,
            urgency_level: typedInput.urgency_level,
            preferred_callback_time: typedInput.preferred_callback_time,
            additional_notes: typedInput.additional_notes
          };

          context.captureDataPoint('patient_details', data);
          return {
            success: true,
            message: "Patient details captured successfully",
            data: data
          };
        }
        return { success: false, message: "Data capture failed" };
      },
    }),
    tool({
      name: "verify_phone_number",
      description: "Verify patient's phone number by repeating back",
      parameters: {
        type: "object",
        properties: {
          phone_number: {
            type: "string",
            description: "Phone number to verify",
            pattern: "^\\+?[0-9]{10,15}$"
          }
        },
        required: ["phone_number"],
        additionalProperties: false
      },
      execute: async (input: unknown) => {
        const typedInput = input as { phone_number: string };
        return {
          success: true,
          message: `Please confirm your number: ${typedInput.phone_number.split('').join(' ')}`,
          phone_number: typedInput.phone_number
        };
      }
    }),
    tool({
      name: "transfer_to_human_agent",
      description: "Transfer call to human agent based on urgency",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            enum: ["emergency", "complex_query", "patient_request"],
            description: "Reason for transfer"
          },
          urgency: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
            description: "Urgency level"
          }
        },
        required: ["reason", "urgency"],
        additionalProperties: false
      },
      execute: async () => {
        return { success: true, message: "Transferring to human agent" };
      }
    }),
    tool({
      name: "log_call_details",
      description: "Record call metadata like duration and transcript",
      parameters: {
        type: "object",
        properties: {
          call_duration: {
            type: "number",
            description: "Duration of call in seconds"
          },
          call_transcript: {
            type: "string",
            description: "Full transcript of the call"
          },
          reference_id: {
            type: "string",
            description: "Unique reference ID for the call"
          }
        },
        required: ["call_duration", "call_transcript", "reference_id"],
        additionalProperties: false
      },
      execute: async (input: unknown, details) => {
        const typedInput = input as {
          call_duration: number;
          call_transcript: string;
          reference_id: string;
        };

        const context = details?.context as any;
        if (context?.captureDataPoint) {
          context.captureDataPoint('call_metadata', typedInput);
          return {
            success: true,
            message: "Call details logged successfully"
          };
        }
        return { success: false, message: "Failed to log call details" };
      }
    })
  ],

  handoffs: [],
});