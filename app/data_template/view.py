from flask import Flask, Blueprint, request, redirect, render_template, session, jsonify, abort
import json
from datetime import date
from database import db
from data_template.model import *

data_template_bp = Blueprint('data_template', __name__)

@data_template_bp.route('/', methods=['GET', 'POST'])
def data_template():
    if request.method == 'POST':
        '''
        template_names 是一個字典，用來區分 '資料集類型' 以及 '延伸資料集' 的模板名稱，
        結構如下：
        template_names = {
            '資料集類型': [], # 包含核心資料集名稱的列表，如 'checklist', 'occurrence', 'samplingevent'。
            '延伸資料集': []  # 包含非核心資料集名稱的列表
        }

        checkbox_names 是一個字典，用來儲存該專案下每一張表用的欄位名稱，
        結構如下：
        checkbox_names = {
            'checklist': [] # 以列表儲存該專案中的 checklist 用到的欄位名稱
        };

        custom_columns 是一個列表，用來儲存使用者自訂的欄位名稱，
        結構如下：
        custom_columns = [] # 以列表儲存自訂的欄位名稱
        '''
        data = request.get_json()
        checkbox_names = data['checkbox_names']
        template_names = data['template_names']
        custom_columns = data['custom_columns']

        session['checkbox_names'] = checkbox_names
        session['template_names'] = template_names
        session['custom_columns'] = custom_columns
        return redirect('/data-edit')
    else:
        templates = CustomTemplates.query.all()
        template_list = [(template.id, template.template_title) for template in templates]

        '''
        檢查 url 上的 project_name 和 project_id 是否存在且匹配
        '''
        project_name = request.args.get('project_name')
        project_id = request.args.get('project_id')

        # 檢查一：url 是否同時傳遞 project_name, project_id 這兩個參數
        if not project_name or not project_id:
            abort(400) 

        # 檢查二：project 是否為正整數
        try:
            project_id = int(project_id)
        except ValueError:
            abort(400)
            
        # 檢查三：查詢資料庫是否有匹配的專案
        project = Projects.query.filter_by(id=project_id, project_name=project_name).first()

        if project:
            return render_template('data-template.html', template_list=template_list)
        else:
            abort(404)

@data_template_bp.route('/test_db/', methods=['GET'])
def test():
    checklists = Occurrence.query.all()
    checklist_dict = [checklist.as_dict() for checklist in checklists]
    return jsonify(checklist_dict)

@data_template_bp.route('/get_template/core/', methods=['GET'])
def get_template_core():
    VALUE_TO_MODEL_MAP = {
        'checklist': Checklist,
        'occurrence': Occurrence,
        'samplingevent': Samplingevent,
        'others': Others
    }
    value = request.args.get('value')
    core = VALUE_TO_MODEL_MAP.get(value).query.all()
    core_dict = [c.as_dict() for c in core]
    return jsonify(core_dict)

@data_template_bp.route('/get_template/extension/', methods=['GET'])
def get_template_extension():
    VALUE_TO_MODEL_MAP = {
        'darwin-core-occurrence': ExtensionOccurrence,
        'simple-multimedia': SimpleMultimedia,
        'extended-measurement-or-facts': ExtendedMeasurementOrFacts,
        'resource-relationship': ResourceRelationship,
        'dna-derived-data': DnaDerivedData
    }
    extension_dict = {}
    value = request.args.get('value')
    value_list = json.loads(value)
    for v in value_list:
        extension = VALUE_TO_MODEL_MAP.get(v).query.all()
        extension_dict[v] = [e.as_dict() for e in extension]
    return jsonify(extension_dict)

@data_template_bp.route('/get_template/theme/', methods=['GET'])
def get_template_theme():
    VALUE_TO_MODEL_MAP = {
        'ecological-survey': EcologicalSurvey,
        'parasite': Parasite,
        'ltser': Ltser
    }
    value = request.args.get('value')
    core = VALUE_TO_MODEL_MAP.get(value).query.all()
    core_dict = [c.as_dict() for c in core]
    return jsonify(core_dict)

@data_template_bp.route('/custom_terms_list', methods=['GET'])
def get_custom_terms_list():
    terms = CustomTerms.query.all()
    terms_list = [term.column_name for term in terms]
    return jsonify(terms_list)

@data_template_bp.route('/custom_terms', methods=['GET'])
def get_custom_terms():
    terms = CustomTerms.query.all()
    return jsonify([term.as_dict() for term in terms])

@data_template_bp.route('/custom_terms', methods=['POST'])
def create_custom_term():
    data = request.get_json()
    today = date.today()
    new_term = CustomTerms(
        column_name=data['column_name'],
        column_type=data.get('column_type'),
        column_comment=data.get('column_comment'),
        last_edited=today
    )
    db.session.add(new_term)
    db.session.commit()
    return jsonify(new_term.as_dict()), 201

@data_template_bp.route('/custom_terms/<int:id>', methods=['DELETE'])
def delete_custom_term(id):
    term = CustomTerms.query.get_or_404(id)
    db.session.delete(term)
    db.session.commit()
    return '', 204

@data_template_bp.route('/custom_templates', methods=['POST'])
def create_custom_templates():
    data = request.get_json()
    today = date.today()
    new_template = CustomTemplates(
        template_title=data.get('template_title'),
        template_content=data.get('template_content'),
        last_updated=today
    )
    db.session.add(new_template)
    db.session.commit()
    return jsonify(new_template.as_dict())

@data_template_bp.route('/custom_templates/<int:id>', methods=['GET'])
def get_custom_templates(id):
    template = CustomTemplates.query.get_or_404(id)
    return jsonify(template.as_dict())

@data_template_bp.route('/custom_templates/<int:id>', methods=['DELETE'])
def delete_custom_templates(id):
    template = CustomTemplates.query.get_or_404(id)
    db.session.delete(template)
    db.session.commit()
    return jsonify(template.as_dict())