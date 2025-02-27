from flask import Flask, Blueprint, request, redirect, render_template, session, jsonify, send_file, url_for
import zipfile
from datetime import date
import tempfile
import os
import pandas as pd
import requests
from sqlalchemy import update
from utils import *
from data_template.model import *
from sqlalchemy.orm.attributes import flag_modified
from socket_io import socketio 


data_clearance_bp = Blueprint('data_clearance', __name__)

@data_clearance_bp.route('/', methods=['GET', 'POST'])
def data_clearance():
    # template_names = session.get('template_names', {})
    table_name = session.get('table_name')
    checkbox_names = session.get('checkbox_names')
    project_id = request.args.get('project_id')
    table_stats = get_table_stats(project_id).get_json()
    template_names = TableHeader.get_template_names(project_id)
    custom_columns = [row.column_name for row in CustomTerms.query.all()]

    return render_template('data-clearance.html', template_names=template_names, table_stats=table_stats, table_name=table_name, checkbox_names=checkbox_names, custom_columns=custom_columns)

@data_clearance_bp.route('/export', methods=['POST'])
def export_as_zip():
    table_name = session.get('table_name')
    table_header = session.get('table_header')
    table_data = session.get('table_data')

    project_id = session.get('project_id')
    # 取出 Projects 資料表中的 table_content，不需要再從前端傳遞
    project_data = Projects.query.filter_by(id=project_id).first() 

    with tempfile.TemporaryDirectory() as temp_dir:
        zip_filename = os.path.join(temp_dir, 'Rasengan.zip')
        with zipfile.ZipFile(zip_filename, 'w') as zf:
            # for name, header, rows in zip(table_name, table_header, table_data):
            #     csv_filename = os.path.join(temp_dir, f'{name}.csv')
            #     df = pd.DataFrame(rows, columns=header)
            #     df.to_csv(csv_filename)
            #     zf.write(csv_filename, arcname=f'{name}.csv')
            for name in table_name:
                if project_data:
                    data = project_data.table_content[name]

                    header = data['checkbox_names']
                    rows = data['data']
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

@data_clearance_bp.route('/text_facet', methods=['GET'])
def get_text_facet_data():
    project_id = request.args.get('project_id')
    table_name = request.args.get('table_name')
    column_name = request.args.get('column_name')

    if not (project_id and table_name and column_name):
        return jsonify({"error": "Project ID, table name, column name are required"}), 400
    
    results = db.session.query(
        func.json_extract(TableData.data, f'$.{column_name}').label('value'),
        func.count().label('count')
    ).filter_by(project_id=project_id, table_name=table_name).group_by('value').all()

    facet_data = [{"value": result.value, "count": result.count} for result in results]

    return facet_data

@data_clearance_bp.route('/text_facet', methods=['PATCH'])
def update_text_facet_data():
    data = request.get_json()
    project_id = data.get('project_id')
    table_name = data.get('table_name')
    column_name = data.get('column_name')
    old_value = data.get('old_value')
    new_value = data.get('new_value')

    if not (project_id and table_name and column_name):
        return jsonify({"error": "Project ID, table name, column name are required"}), 400
    
    if new_value is None:
        return jsonify({"error": "New value is required"}), 400
    
    try:
        query = update(TableData).where(
            TableData.project_id == project_id,
            TableData.table_name == table_name
        )
        
        if old_value is not None:  # 如果 old_value 有值
            query = query.where(
                func.json_extract(TableData.data, f'$.{column_name}') == old_value
            )
        else:  # 如果 old_value 為空
            query = query.where(
                func.json_extract(TableData.data, f'$.{column_name}').is_(None) 
            )

        query = query.values({
            TableData.data: func.json_set(TableData.data, f'$.{column_name}', new_value)
        })
        
        db.session.execute(query)
        db.session.commit()
        return jsonify({"success": "Alter data successfully"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
@data_clearance_bp.route('/column_swap', methods=['PATCH'])
def swap_column_content():
    data = request.get_json()
    project_id = data.get('project_id')
    table_name = data.get('table_name')
    column_name_1 = data.get('column_name_1')
    column_name_2 = data.get('column_name_2')

    if not (project_id and table_name and column_name_1 and column_name_2):
        return jsonify({"error": "Project ID, table name, column name are required"}), 400
    
    try:
        table_data = TableData.query.filter_by(project_id=project_id, table_name=table_name).all()

        if not table_data:
            return jsonify({"error": "No data found for the specified project and table"}), 404
        
        query = update(TableData).where(
            TableData.project_id == project_id,
            TableData.table_name == table_name
        ).values({
            TableData.data: func.json_set(
                func.json_set(
                    TableData.data, 
                    f'$.{column_name_1}', func.json_extract(TableData.data, f'$.{column_name_2}')
                ),
                f'$.{column_name_2}', func.json_extract(TableData.data, f'$.{column_name_1}')
            )
        })
        
        db.session.execute(query)

        db.session.commit()
        return jsonify({"success": "Data successfully swapped"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
@data_clearance_bp.route('/species_api', methods=['PATCH'])
def fetch_species_apis():
    data = request.get_json()
    project_id = data.get('project_id')
    table_name = data.get('table_name')
    taicol_unfetched_species = None
    gbif_unfetched_species = None
    
    if not (project_id and table_name):
        return jsonify({"error": "Project ID and table name are required"}), 400
    
    try:
        table_data = TableData.query.filter_by(project_id=project_id, table_name=table_name).all()
        table_header_entry = TableHeader.query.filter_by(project_id=project_id, table_name=table_name).first()
        table_header = table_header_entry.table_header

        if not table_data:
            return jsonify({"error": "No data found for the specified project and table"}), 404
        
        # 新增串接 API 之後增加的欄位
        new_headers = ['acceptedNameUsageID', 'taxonRank', 'kingdom', 'phylum', 'order', 'family', 'genus', 'source']
        for header in new_headers:
            if header not in table_header:
                table_header.append(header)
        table_header_entry.table_header = table_header.copy()
        flag_modified(table_header_entry, 'table_header')
        db.session.add(table_header_entry)
        
        # 挑出所有 scientific_names 中的唯一值
        scientific_names = set()
        for row in table_data:
            scientific_name = row.data.get('scientificName')
            if scientific_name and scientific_name.strip():
                scientific_names.add(scientific_name.strip())

        results = {}

        # 串接 TaiCOL 物種 API
        progress = 0
        for name in scientific_names:
            url = f'https://api.taicol.tw/v2/taxon?scientific_name={name}'
            response = requests.get(url)
            if response.status_code == 200:
                taicol_status = response.json().get('status').get('code')
                if int(taicol_status) == 200:
                    data = response.json().get('data')[0]
                    filtered_data = {
                        "acceptedNameUsageID": data.get('taxon_id'),
                        "taxonRank": data.get('rank').lower(),
                        "source": 'TaiCOL'
                    }
                    results[name] = filtered_data
                else: 
                    results[name] = {
                        "error": f"Failed to fetch data for {name}, status code {taicol_status}"
                    }
            else:
                results[name] = {
                    "error": f"Failed to fetch data for {name}, status code {response.status_code}"
                }

            progress += 1
            total = len(scientific_names)
            # 每進度達到 10% 發送更新
            if total > 0 and progress % max(1, total // 10) == 0:  # 確保不會除以零
                try:
                    socketio.emit('update', {'progress': progress, 'total': total, 'status': '串接 TaiCOL 物種 API 中'})
                except Exception as emit_error:
                    print(f"Error emitting update: {str(emit_error)}")

        # 挑出 TaiCOL 配對不到的物種名
        taicol_unfetched_species = [name for name, result in results.items() if 'error' in result]

        # 串接 TaiCOL 較高階層 API
        progress = 0
        for name, result in results.items():
            filtered_data = {
                "genus": None,
                "family": None,
                "order": None,
                "class": None,
                "phylum": None,
                "kingdom": None,
            }
            taxon_id = result.get('acceptedNameUsageID')
            url = f'https://api.taicol.tw/v2/higherTaxa?taxon_id={taxon_id}'
            response = requests.get(url)
            if response.status_code == 200:
                higher_taxa_data = response.json().get('data')
                if higher_taxa_data:
                    for taxon in higher_taxa_data:
                        rank = taxon.get('rank')
                        simple_name = taxon.get('simple_name')
                        if rank and simple_name:
                            if rank == 'Genus':
                                filtered_data['genus'] = simple_name
                            elif rank == 'Family':
                                filtered_data['family'] = simple_name
                            elif rank == 'Order':
                                filtered_data['order'] = simple_name
                            elif rank == 'Class':
                                filtered_data['class'] = simple_name
                            elif rank == 'Phylum':
                                filtered_data['phylum'] = simple_name
                            elif rank == 'Kingdom':
                                filtered_data['kingdom'] = simple_name
                    
                    results[name].update(filtered_data)
                else:
                    results[name] = filtered_data

            progress += 1
            total = len(results)
            # 每進度達到 10% 發送更新
            if total > 0 and progress % max(1, total // 10) == 0:  # 確保不會除以零
                try:
                    socketio.emit('update', {'progress': progress, 'total': total, 'status': '串接 TaiCOL 較高階層 API 中'})
                except Exception as emit_error:
                    print(f"Error emitting update: {str(emit_error)}")

        # 串接 GBIF species API
        progress = 0
        for name in taicol_unfetched_species:
            url = f'https://api.gbif.org/v1/species/match?name={name}'
            response = requests.get(url)
            if response.status_code == 200:
                data = response.json()
                match_type = data.get('matchType')
                if match_type == 'EXACT':
                    filtered_data = {
                        "acceptedNameUsageID": data.get("usageKey"),
                        "taxonRank": data.get("rank").lower(),
                        "kingdom": data.get("kingdom"),
                        "phylum": data.get("phylum"),
                        "order": data.get("order"),
                        "family": data.get("family"),
                        "genus": data.get("genus"),
                        "source": 'GBIF'
                    }
                    results[name] = filtered_data
                else:
                    results[name] = {
                        "acceptedNameUsageID": None,
                        "taxonRank": None,
                        "kingdom": None,
                        "phylum": None,
                        "order": None,
                        "family": None,
                        "genus": None,
                        "source": None,
                        "error": f"No exact match found for {name}"
                    }
            else:
                results[name] = {
                    "acceptedNameUsageID": None,
                    "taxonRank": None,
                    "kingdom": None,
                    "phylum": None,
                    "order": None,
                    "family": None,
                    "genus": None,
                    "source": None,
                    "error": f"Failed to fetch data for {name}, status code {response.status_code}"
                }

            progress += 1
            total = len(taicol_unfetched_species)
            # 每進度達到 10% 發送更新
            if total > 0 and progress % max(1, total // 10) == 0:  # 確保不會除以零
                try:
                    socketio.emit('update', {'progress': progress, 'total': total, 'status': '串接 GBIF API 中'})
                except Exception as emit_error:
                    print(f"Error emitting update: {str(emit_error)}")

            gbif_unfetched_species = [name for name, result in results.items() if 'error' in result]

        # 將 API 內容映射到資料表中並儲存
        progress = 0
        total = len(table_data)

        for row in table_data:
            progress += 1

            # 每進度達到 10% 發送更新
            if total > 0 and progress % max(1, total // 10) == 0:  # 確保不會除以零
                try:
                    socketio.emit('update', {'progress': progress, 'total': total, 'status': '更新資料庫中'})
                except Exception as emit_error:
                    print(f"Error emitting update: {str(emit_error)}")

            # 更新資料庫中的資料
            scientific_name = row.data.get('scientificName')
            if scientific_name and scientific_name.strip() in results:
                row.data.update(results[scientific_name.strip()])  
                flag_modified(row, 'data')   
                db.session.add(row)

        try:
            socketio.emit('update', {'progress': total, 'total': total, 'status': '資料庫更新完成'})
        except Exception as emit_error:
            print(f"Error emitting update: {str(emit_error)}")

        db.session.commit()
        return jsonify({"success": "Data was fetched and updated successfully",
                        "alert": gbif_unfetched_species})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
