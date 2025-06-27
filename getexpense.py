import json
from google.cloud import firestore
from flask import Flask, request, jsonify  # type: ignore # Ensure Flask and relevant modules are imported

# Initialize Firestore client and reference the correct collection
db = firestore.Client(database="expensestable")
collection = db.collection('expensestable')

# Helper function to add CORS headers to responses
def add_cors_headers(response):
    response.headers.add("Access-Control-Allow-Origin", "*")  # Replace with specific domain in production
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.add("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS")
    return response

# Main Cloud Function to fetch all expenses
def get_expenses(request):
    # Handle CORS preflight (OPTIONS) request
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)

    response_data = {}
    status_code = 200

    try:
        # Retrieve all documents from the collection
        docs = collection.stream()
        expenses = []

        for doc in docs:
            data = doc.to_dict()
            data['expense_id'] = doc.id  # Include Firestore document ID in the response
            expenses.append(data)

        response_data = expenses  # Return the full list of expense records
        status_code = 200

    except Exception as e:
        # Catch-all for unexpected errors
        response_data = {
            "status": "error",
            "message": f"❌ Error: {str(e)}"
        }
        status_code = 500

    # Wrap response in JSON and apply CORS headers
    final_response = jsonify(response_data)
    return add_cors_headers(final_response), status_code