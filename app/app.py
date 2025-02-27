import os
from flask import Flask, Blueprint, render_template
from database import db
from flask_migrate import Migrate
import webbrowser
from data_template.model import *
from data_template.view import data_template_bp
from data_edit.view import data_edit_bp
from data_validation.view import data_validation_bp
from data_clearance.view import data_clearance_bp
from data_project.view import data_project_bp
from socket_io import socketio
from engineio.async_drivers import threading


def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.urandom(24)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(os.path.dirname(__file__), 'init.db')
    db.init_app(app)
    migrate = Migrate(app, db)

    app.register_blueprint(data_template_bp, url_prefix='/data-template')
    app.register_blueprint(data_edit_bp, url_prefix='/data-edit')
    app.register_blueprint(data_validation_bp, url_prefix='/data-validation')
    app.register_blueprint(data_clearance_bp, url_prefix='/data-clearance')
    app.register_blueprint(data_project_bp, url_prefix='/data-project')

    socketio.init_app(app)

    return app

def setup_database(app):
    with app.app_context():
        db.create_all()

if __name__ == '__main__':
    PORT = 5555
    app = create_app()

    if not os.environ.get("WERKZEUG_RUN_MAIN"): # The reloader has not yet run, open the browser
        webbrowser.open_new('http://127.0.0.1:5555/data-project')
    if not os.path.isfile(os.path.join(os.path.dirname(__file__), 'init.db')):
        setup_database(app)

    socketio.run(app, host='0.0.0.0', port=PORT, debug=True)
    # app.run(host='0.0.0.0', port=PORT)