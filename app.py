import os
from flask import Flask
from dotenv import load_dotenv

from views import views


def create_app() -> Flask:
    """Create and configure Flask application."""
    load_dotenv()
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")
    app.register_blueprint(views, url_prefix="/Capstone")
    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True, port=8002)
