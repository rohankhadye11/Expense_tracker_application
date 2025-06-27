import json
import uuid
from decimal import Decimal
from google.cloud import firestore, pubsub_v1
from flask import Flask, request, jsonify # type: ignore # Ensure Flask and relevant modules are imported

# Initialize Firestore client and specify the collection
db = firestore.Client(database="expensestable")
collection = db.collection('expensestable')

# Initialize Pub/Sub publisher
TOPIC_ID = "expensesalert"  # Update this if your topic ID changes
PROJECT_ID = "PROJECT_ID"  # Replace with  actual GCP project ID
publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path(PROJECT_ID, TOPIC_ID)

# Add CORS headers to every response
def add_cors_headers(response):
    response.headers.add("Access-Control-Allow-Origin", "*")  # For production, restrict to your frontend domain
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.add("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS")
    return response

# Cloud Function entry point
def expense_tracker(request):
    # Handle CORS preflight (OPTIONS) request
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)

    # Default response
    response_data = {}
    status_code = 200

    try:
        # Parse incoming JSON
        request_json = request.get_json(silent=True)

        if not request_json:
            # Handle invalid/missing JSON
            response_data = {"status": "error", "message": "❌ Invalid JSON input"}
            status_code = 400

        else:
            # Required fields for expense submission
            required_fields = ["amount", "category", "date", "description"]

            # Check for missing fields
            if not all(field in request_json for field in required_fields):
                response_data = {
                    "status": "error",
                    "message": f"❌ Missing one or more required fields: {', '.join(required_fields)}"
                }
                status_code = 400

            else:
                # Generate unique ID for the expense
                expense_id = str(uuid.uuid4())

                # Attempt to convert amount to Decimal
                try:
                    amount = Decimal(str(request_json["amount"]))
                except Exception:
                    response_data = {
                        "status": "error",
                        "message": "❌ Invalid amount format. Must be a number."
                    }
                    status_code = 400
                    final_response = jsonify(response_data)
                    return add_cors_headers(final_response), status_code

                # Extract other fields
                category = request_json["category"]
                date = request_json["date"]
                description = request_json["description"]

                # Save expense to Firestore
                doc_ref = collection.document(expense_id)
                doc_ref.set({
                    "expense_id": expense_id,
                    "amount": float(amount),  # Convert Decimal to float for Firestore
                    "category": category,
                    "date": date,
                    "description": description
                })

                # Publish alert to Pub/Sub if amount exceeds 5000
                if amount > 5000:
                    message_content = {
                        "expense_id": expense_id,
                        "amount": float(amount),
                        "category": category,
                        "date": date,
                        "description": description
                    }
                    message_json = json.dumps(message_content)
                    publisher.publish(
                        topic_path,
                        data=message_json.encode("utf-8"),  # Convert to bytes
                        subject="💸 Expense Alert: Over ₹5000"
                    )

                # Return success response
                response_data = {
                    "status": "success",
                    "message": "✅ Expense added successfully!",
                    "expense_id": expense_id
                }
                status_code = 200

    except Exception as e:
        # Catch-all error handling
        response_data = {"status": "error", "message": f"❌ Error: {str(e)}"}
        status_code = 500

    # Final response with CORS headers
    final_response = jsonify(response_data)
    return add_cors_headers(final_response), status_code