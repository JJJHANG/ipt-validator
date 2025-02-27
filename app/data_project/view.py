from flask import Flask, Blueprint, request, redirect, render_template, session, jsonify
import json
from datetime import date
from database import db
from data_template.model import *

data_project_bp = Blueprint('data_project', __name__)

@data_project_bp.route('/', methods=['GET'])
def data_project():
    projects = get_projects()
    return render_template('data-project.html', projects=projects)

@data_project_bp.route('/projects_list', methods=['GET'])
def get_projects_list():
    projects = Projects.query.all()
    projects_list = [project.project_name for project in projects]
    return jsonify(projects_list)

@data_project_bp.route('/projects', methods=['GET'])
def get_projects():
    projects = Projects.query.all()
    return [project.as_dict() for project in projects]

@data_project_bp.route('/projects', methods=['POST'])
def create_projects():
    data = request.get_json()
    today = date.today()
    new_project = Projects(
        project_name=data['project_name'],
        last_updated=today
    )
    db.session.add(new_project)
    db.session.commit()
    return jsonify(new_project.as_dict()), 201

@data_project_bp.route('/projects/<int:id>', methods=['GET'])
def get_project(id):
    # project = Projects.query.get_or_404(id)
    project_data = TableHeader.get_table_headers(id)
    return jsonify(project_data)

@data_project_bp.route('/projects/<int:id>', methods=['DELETE'])
def delete_projects(id):
    project = Projects.query.get_or_404(id)
    db.session.delete(project)
    db.session.commit()
    return '', 204