from flask import Flask, jsonify
from flask_cors import CORS
from routes.graph_routes import graph_bp

def create_app():
    app = Flask(__name__)

    # Enable CORS for React frontend
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": [
                    "http://localhost:3000",
                    "http://127.0.0.1:3000"
                ]
            }
        }
    )

    # Register blueprint (ALL routes under /api)
    app.register_blueprint(graph_bp, url_prefix='/api')

    # Root route (quick test)
    @app.route('/')
    def home():
        return jsonify({
            "message": "RAG Backend Running 🚀",
            "status": "OK"
        })

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)