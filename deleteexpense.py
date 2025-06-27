import json
from google.cloud import firestore
from flask import Flask, request, jsonify # type: ignore # Ensure Flask and relevant modules are imported

# Initialize Firestore client and specify the collection
db = firestore.Client(database="expensestable")
collection = db.collection('expensestable')

# Utility function to add CORS headers to responses
def add_cors_headers(response):
    response.headers.add("Access-Control-Allow-Origin", "*")  # Replace with specific frontend URL in production
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.add("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS")
    return response

# Main Cloud Function to delete an expense
def delete_expense(request):
    # Handle CORS preflight (OPTIONS) request
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)

    # Default response setup
    response_data = {}
    status_code = 200

    try:
        # Parse the incoming JSON request
        request_json = request.get_json(silent=True)

        # Validate presence of 'expense_id'
        if not request_json or "expense_id" not in request_json:
            response_data = {
                "status": "error",
                "message": "❌ Missing or invalid 'expense_id' in request"
            }
            status_code = 400

        else:
            expense_id = request_json["expense_id"]

            # Reference the document in Firestore
            doc_ref = collection.document(expense_id)
            doc = doc_ref.get()

            # Check if document exists
            if not doc.exists:
                response_data = {
                    "status": "error",
                    "message": f"❌ Expense with ID '{expense_id}' not found"
                }
                status_code = 404

            else:
                # Delete the document
                doc_ref.delete()
                response_data = {
                    "status": "success",
                    "message": "✅ Expense deleted successfully!"
                }
                status_code = 200

    except Exception as e:
        # Handle any unexpected exceptions
        response_data = {
            "status": "error",
            "message": f"❌ Error: {str(e)}"
        }
        status_code = 500

    # Final response with CORS headers applied
    final_response = jsonify(response_data)
    return add_cors_headers(final_response), status_code