from flask import Flask, Blueprint, request, redirect, render_template, session, jsonify, send_file, url_for
import json
from datetime import date
import tempfile
import zipfile
import os
import pandas as pd
import csv
from utils import *


data_validation_bp = Blueprint('data_validation', __name__)

@data_validation_bp.route('/', methods=['GET'])
def data_validation():
    template_names = session.get('template_names', {})
    table_name = session.get('table_name')

    project_id = session.get('project_id')
    table_stats = get_table_stats(project_id).get_json()
    
    return render_template('data-validation.html', table_stats=table_stats, table_name=table_name, template_names=template_names)

@data_validation_bp.route('/download', methods=['POST'])
def download_result():
    table_stats = session.get('table_stats')
    data = []

    for main_key, sub_dict in table_stats.items():
    # 遍歷子字典中的鍵值對
        for sub_key, values in sub_dict.items():
            for sub_sub_key, sub_values in values.items():
                if sub_values.get('valid_percentage') != 100:  
                    row_data = {
                        'Template': main_key,
                        'Term': sub_sub_key,
                        **sub_values  # 使用 ** 來展開子字典中的所有鍵值對
                    }
                    
                    data.append(row_data)

    # 將列表轉換為 DataFrame
    df = pd.DataFrame(data)
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.csv')
    df.to_csv(temp_file.name, index=False)

    try:
        return send_file(temp_file.name,
                        mimetype='"text/csv"',
                        as_attachment=True,
                        download_name=f'error-{date.today()}.csv')
    except FileNotFoundError:
        print('404')