from flask import Flask, Blueprint, request, redirect, render_template, session, jsonify, send_file, url_for
import json
from datetime import date
import tempfile
import zipfile
import os
import pandas as pd
import csv
from data_template.model import *
from data_edit.validate import *
from utils import *


data_edit_bp = Blueprint('data_edit', __name__)

@data_edit_bp.route('/store_data', methods=['POST'])
def get_project_data():
    '''
    功能：從 專案管理 頁面傳遞渲染 編輯資料 頁面需要的內容，將內容透過此中繼函數儲存到 session 中，
    需要實際渲染頁面時，再從 session 中取出對應的內容，參考def data_edit()。

    template_names 是一個字典，用來區分 '資料集類型' 以及 '延伸資料集' 的模板名稱，
    結構如下：
    template_names = {
        '資料集類型': [], # 包含核心資料集名稱的列表，如 'checklist', 'occurrence', 'samplingevent'
        '延伸資料集': []  # 包含非核心資料集名稱的列表
    }

    checkbox_names 是一個字典，用來儲存該專案下每一張表用的欄位名稱，
    結構如下：
    checkbox_names = {
        'checlist': [] # 以列表儲存該專案中的 checklist 用到的欄位名稱
    };
    '''
    data = request.get_json()
    session['project_name'] = data['project_name']
    session['project_id'] = data['project_id']
    session['template_names'] = data['template_names']
    session['checkbox_names'] = data['checkbox_names']
    return '', 204

@data_edit_bp.route('/store_mapping_result', methods=['POST'])
def get_mapping_result():
    mapping_result = request.get_json()
    # print(mapping_result)
    session['mapping_result'] = mapping_result
    return '', 204

@data_edit_bp.route('/', methods=['GET', 'POST'])
def data_edit():
    checkbox_names = session.get('checkbox_names', {})
    template_names = session.get('template_names', {})
    custom_columns = session.get('custom_columns', [])
    mapping_result = session.get('mapping_result', None)
    template_name = session.get('template_name', None)
    parsed_import_data = None

    if mapping_result:
        import_data = session.get('import_data', [])
        import_file_path = session.get('import_file_path', None)
        checkbox_names_list = session.get('checkbox_names_list', [])
        if import_file_path:
            # df = pd.DataFrame(import_data[1:], columns=import_data[0])
            df = pd.read_csv(f'{import_file_path}')
            new_df = pd.DataFrame(columns=checkbox_names_list)

            for key, value in mapping_result.items():
                if key in checkbox_names_list and value in df.columns:
                    # 將原始 df 中的 value 欄位數據填充到新 df 中的 key 欄位
                    new_df[key] = df[value]
            
            new_df = new_df.fillna('')
            # print(new_df)
            header = new_df.columns.tolist()
            parsed_import_data = [header] + new_df.values.tolist()
            for single_data in parsed_import_data:
                for index, single_value in enumerate(single_data):
                    if single_value == '':
                        single_data[index] = None
            
            # print(parsed_import_data)
        session['mapping_result'] = None

    return render_template('data-edit.html', 
                           checkbox_names=checkbox_names, 
                           template_names=template_names, 
                           custom_columns=custom_columns, 
                           parsed_import_data=parsed_import_data, 
                           template_name=template_name)

@data_edit_bp.route('/transfer', methods=['POST'])
def tansfer_data():
    '''
    功能：從 編輯資料 傳遞匯出資料表需要的內容，將內容透過此中繼函數儲存到 session 中，
    需要會出匯出資料表時，再從 session 中取出對應的內容，參考 def export_as_zip()。

    table_name 是一個列表，用來儲存資料表的名稱，匯出時會以此作為檔名，
    結構如下：
    table_name = ['samplingevent'] # 列表中一次只會有一個元素

    table_header 是一個列表，用來儲存資料表的所有 header，
    結構如下：
    table_header = ['eventID', 'occurrenceID', 'taxonID'...]

    table_data 是一個雙層列表，用來儲存資料表中每一列中的內容，
    結構如下：
    table_data = [
        [], # 第二層中的每一個列表代表該列中的內容
        [],
        []
    ]
    '''
    if request.method == 'POST':
        data = request.get_json()
        table_name = data['table_name']
        project_id = data['project_id']


        session['table_name'] = table_name
        session['project_id'] = project_id

    return jsonify({'success': 'Recieved data successfully'})

@data_edit_bp.route('/export', methods=['POST'])
def export_as_zip():
    table_name = session.get('table_name')[0]
    project_id = session.get('project_id')
    # 取出 Projects 資料表中的 table_content，不需要再從前端傳遞
    project_data = Projects.query.filter_by(id=project_id).first() 
    if project_data:
        data = project_data.table_content[table_name]

        table_header = []
        table_data = []
        table_data.append(data['data'])
        table_header.append(data['checkbox_names'])

    if not table_name or not table_header or not table_data:
        return 'No data to export', 400

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            for name, header, rows in zip(table_name, table_header, table_data):
                csv_filename = os.path.join(temp_dir, f'{name}.csv')
                with open(csv_filename, 'w', newline='') as csvfile:
                    csvwriter = csv.writer(csvfile)
                    csvwriter.writerow(header)  
                    csvwriter.writerows(rows)  

            return send_file(csv_filename, as_attachment=True, download_name=f'{table_name}-{date.today()}.csv')
    except FileNotFoundError:
        return 'File not found', 404
    except Exception as e:
        return str(e), 500

@data_edit_bp.route('/import', methods=['POST'])
def import_as_json():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'})

    file = request.files['file']
    template_name = request.form.get('template_name')
    checkbox_names = request.form.get('checkbox_names')

    checkbox_names_list = checkbox_names.split(',')

    if file.filename == '':
        return jsonify({'error': 'No selected file'})
    
    print(f'file: {file}')

    if file:
        try:
            header = []
            # 使用系統的臨時目錄
            temp_dir = tempfile.gettempdir()
            file_path = os.path.join(temp_dir, file.filename) 
            # print(f'file path: {file_path}')
            file.save(file_path)  

            with open(file_path, 'r') as csv_file:
                reader = csv.reader(csv_file)
                header = next(reader) 
            
            # print(f'header: {header}')

            session['import_filename'] = file.filename
            session['template_name'] = template_name
            session['checkbox_names_list'] = checkbox_names_list
            session['import_data_header'] = header
            session['import_file_path'] = file_path
            return jsonify({'success': 'Saved file Successfully'})
        except Exception as e:
            return jsonify({'error': str(e)})

@data_edit_bp.route('/custom_terms', methods=['GET'])
def get_custom_terms_with_type():
    terms = CustomTerms.query.all()
    terms_dict = {}

    for term in terms:
        column_type = term.column_type
        column_name = term.column_name
        
        if column_type not in terms_dict:
            terms_dict[column_type] = []
        terms_dict[column_type].append(column_name)

    return jsonify(terms_dict)

@data_edit_bp.route('/autosave', methods=['PATCH'])
def autosave_table():
    data = request.get_json()
    today = date.today()
    project_id = data.get('project_id')
    table_content = data.get('table_content')

    if not project_id or not table_content:
        return jsonify({"error": "Missing project_id or table_content"}), 400

    # 查找現有的專案
    project = Projects.query.get(project_id)
    if not project:
        return jsonify({"error": "Project not found"}), 404

    # 更新表格內容和最後更新日期
    project.table_content = table_content
    project.last_updated = today

    try:
        db.session.commit()
        return jsonify({"message": "Table content saved successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@data_edit_bp.route('/validate', methods=['POST'])
def process_validation():
    '''
    功能：接收每一張資料表的內容，並進行資料驗證

    table_name 是一個列表，用來儲存資料表的名稱，匯出時會以此作為檔名，
    結構如下：
    table_name = ['darwin-core-occurrence', 'samplingevent'] 

    table_header 是一個雙層列表，用來儲存每一張資料表的所有 header，
    結構如下：
    table_header = [
        [], # 資料表 darwin-core-occurrence 的 header
        []  # 資料表 samplingevent 的 header
    ]

    table_data 是一個三層列表，用來儲存每一張資料表中每一列中的內容，
    結構如下：
    table_data = [
        [ # 資料表 darwin-core-occurrence 的內容
            [], # 表中第一列內容
            [], # 表中第二列內容
            ...
        ],
        [  # 資料表 samplingevent 的內容
            [],
            [],
            ...
        ]
    ]

    custom_terms 自訂欄位的名稱，格式為字典，
    結構如下：
    custom_terms = {
        key1: [], # key 代表自訂欄位的種類，value 為列表，代表該種類下的自訂欄位名稱
        key2: [],
        ...
    }
    '''

    CONTROLLED_VOCABULARY_COLUMNS = ['basisOfRecord', 'type', 'occurrenceStatus', 'continent', 'language', 'license', 'sex', 'establishmentMeans', 'degreeOfEstablishment', 'typeStatus', 'kingdom']
    UNIQUE_ID_COLUMNS = ['eventID', 'occurrenceID', 'taxonID', 'samp_name']
    LON_LAT_COLUMNS = ['decimalLongitude', 'decimalLatitude']
    DATETIME_COLUMNS = ['eventDate']
    DATE_COLUMNS = ['year', 'month', 'day']
    INT_COLUMNS = ['individualCount', 'maximumElevationMeters', 'minimumElevationInMeters', 'maximumDepthInMeters', 'minimumDepthInMeters']

    if request.method == 'POST':
        data = request.get_json()
        table_name = data['table_name']

        project_id = data['project_id'] # 取出 Projects 資料表中的 table_content，不需要再從前端傳遞
        project_data = Projects.query.filter_by(id=project_id).first() 
        if project_data:
            data = project_data.table_content 

            table_header = []
            table_data = []
            for key, table_content in data.items():
                table_data.append(table_content['data'])
                table_header.append(table_content['checkbox_names'])

        # print(f'table_header: {table_header}')
        custom_terms = data.get('custom_terms', {})
        custom_data_terms = custom_terms.get('date', [])
        for term in custom_data_terms:
            DATETIME_COLUMNS.append(term)
        table_stats = {}

        # *****開始清理流程*****
        for name, header, rows in zip(table_name, table_header, table_data):
            df = pd.DataFrame(rows, columns=header)
            # print(df)
            stats_dict = {}

            if name in ['checklist', 'occurrence', 'samplingevent']: # 只有核心才檢查 ID 類欄位
                UNIQUE_ID_COLUMNS = ['eventID', 'occurrenceID', 'taxonID', 'samp_name']
                unique_stats = validate_unique_column(df, header, UNIQUE_ID_COLUMNS)
                stats_dict['unique_stats'] = unique_stats
            elif name in ['darwin-core-occurrence']:
                UNIQUE_ID_COLUMNS = ['occurrenceID']
                unique_stats = validate_unique_column(df, header, UNIQUE_ID_COLUMNS)
                stats_dict['unique_stats'] = unique_stats
            elif name in ['extended-measurement-or-facts']:
                UNIQUE_ID_COLUMNS = ['measurementID']
                unique_stats = validate_unique_column(df, header, UNIQUE_ID_COLUMNS)
                stats_dict['unique_stats'] = unique_stats
            elif name in ['resource-relationship']:
                UNIQUE_ID_COLUMNS = ['resourceID']
                unique_stats = validate_unique_column(df, header, UNIQUE_ID_COLUMNS)
                stats_dict['unique_stats'] = unique_stats
            elif name in ['dna-derived-data']:
                UNIQUE_ID_COLUMNS = ['samp_name']
                unique_stats = validate_unique_column(df, header, UNIQUE_ID_COLUMNS)
                stats_dict['unique_stats'] = unique_stats
            elif name in ['others']:
                UNIQUE_ID_COLUMNS = ['dataID']
                unique_stats = validate_unique_column(df, header, UNIQUE_ID_COLUMNS)
                stats_dict['unique_stats'] = unique_stats
            else:
                UNIQUE_ID_COLUMNS = []
                stats_dict['unique_stats'] = {}

            # 執行控制詞彙欄位的統計並存入字典
            controlled_stats = validate_controll_column(df, header, CONTROLLED_VOCABULARY_COLUMNS)
            stats_dict['controlled_stats'] = controlled_stats

            lon_stats = validte_lon_column(df, header, LON_LAT_COLUMNS)
            stats_dict['lon_stats'] = lon_stats

            lat_stats = validte_lat_column(df, header, LON_LAT_COLUMNS)
            stats_dict['lat_stats'] = lat_stats

            datetime_stats = validate_datetime_coulmn(df, header, DATETIME_COLUMNS)
            stats_dict['datetime_stats'] = datetime_stats

            date_column_stats = validate_date_column(df, header, DATE_COLUMNS)
            stats_dict['date_column_stats'] = date_column_stats

            # int_column_stats = validate_int_column(df, header, INT_COLUMNS)
            # stats_dict['int_column_stats'] = int_column_stats 

            remain_column_stats = validate_blank_column(df, header, CONTROLLED_VOCABULARY_COLUMNS, UNIQUE_ID_COLUMNS, LON_LAT_COLUMNS, DATETIME_COLUMNS, DATE_COLUMNS)
            stats_dict['remain_column_stats'] = remain_column_stats 

            # 將該字典存入主字典中，對應於當前的name
            table_stats[name] = stats_dict

            # app.logger.info(f'name: {table_name}, header: {table_header}, data: {table_data}')
        # print(f'table_stats: {table_stats}')

    delete_table_stats(project_id) # 先清掉 ErrorMesssages 表中的所有內容，理論上同一時間下只會有一筆資料
    save_table_stats(project_id, table_stats)
    session['table_name'] = table_name
    session['project_id'] = project_id
    
    # return redirect(url_for('data_validation.data_validation'))
    return jsonify({'success': 'Recieved data successfully'})

@data_edit_bp.route('/column_mapping', methods=['GET'])
def column_mapping():
    import_filename = session.get('import_filename', '')
    template_name = session.get('template_name', '')
    checkbox_names_list = session.get('checkbox_names_list', [])
    import_data_header = session.get('import_data_header', [])

    checkbox_names_set = set(checkbox_names_list)
    unmapped_columns_list = [header for header in import_data_header if header not in checkbox_names_set]

    return render_template('column-mapping.html',
                           import_data_header=import_data_header, 
                           import_filename=import_filename, 
                           template_name=template_name,
                           checkbox_names_list=checkbox_names_list,
                           unmapped_columns_list=unmapped_columns_list)
