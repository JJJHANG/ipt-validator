from flask import Flask, Blueprint, request, redirect, render_template, session, jsonify, send_file, url_for
import zipfile
from datetime import date
import tempfile
import os
import pandas as pd
from utils import *
from data_template.model import *

data_clearance_bp = Blueprint('data_clearance', __name__)

@data_clearance_bp.route('/', methods=['GET', 'POST'])
def data_clearance():
    template_names = session.get('template_names', [])
    # table_stats = session.get('table_stats')
    table_name = session.get('table_name')
    checkbox_names = session.get('checkbox_names')
    custom_columns = session.get('custom_columns', [])
    project_id = session.get('project_id')
    table_stats = get_table_stats(project_id).get_json()

    return render_template('data-clearance.html', template_names=template_names, table_stats=table_stats, table_name=table_name, checkbox_names=checkbox_names, custom_columns=custom_columns)

@data_clearance_bp.route('/export', methods=['POST'])
def export_as_zip():
    table_name = session.get('table_name')
    table_header = session.get('table_header')
    table_data = session.get('table_data')

    with tempfile.TemporaryDirectory() as temp_dir:
        zip_filename = os.path.join(temp_dir, 'Rasengan.zip')
        with zipfile.ZipFile(zip_filename, 'w') as zf:
            for name, header, rows in zip(table_name, table_header, table_data):
                csv_filename = os.path.join(temp_dir, f'{name}.csv')
                df = pd.DataFrame(rows, columns=header)
                df.to_csv(csv_filename)
                zf.write(csv_filename, arcname=f'{name}.csv')
        try:
            return send_file(zip_filename, as_attachment=True, download_name=f'dataset-{date.today()}.zip')
        except FileNotFoundError:
            print('404')

@data_clearance_bp.route('/project_data', methods=['GET'])
def get_project_data():
    '''
    回傳對應的 欄位名稱 以及 資料
    '''

    project_id = request.args.get('project_id')
    project_name = request.args.get('project_name')
    template_name = request.args.get('template_name')

    project = Projects.query.filter_by(id=project_id, project_name=project_name).first()

    if project:
        table_content = project.table_content 
        checkbox_name_list = table_content.get(template_name, {}).get('checkbox_names', [])

        table_data_list = table_content.get(template_name, {}).get('data', [])
        table_data_list.insert(0, checkbox_name_list)
    else:
        checkbox_name_list = []
        table_data_list = []

    return jsonify({'checkbox_name_list': checkbox_name_list,
                    'table_data_list': table_data_list})