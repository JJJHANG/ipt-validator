from flask import Flask, Blueprint, request, redirect, render_template, session, jsonify, send_file, url_for
from datetime import date
import zipfile
import io
import csv
from utils import *
from data_template.model import *


data_validation_bp = Blueprint('data_validation', __name__)

@data_validation_bp.route('/', methods=['GET'])
def data_validation():
    table_name = session.get('table_name')

    project_id = session.get('project_id')
    template_names = TableHeader.get_template_names(project_id) 
    table_stats = get_table_stats(project_id).get_json()
    
    return render_template('data-validation.html', table_stats=table_stats, table_name=table_name, template_names=template_names)

@data_validation_bp.route('/download_error_messages', methods=['GET'])
def download_error_messages():
    project_id = request.args.get('project_id')

    if not project_id:
        return {"error": "Missing project_id."}, 400

    error_message_content = ErrorMessages.query.filter_by(project_id=project_id).first().content

    # 創建一個內存緩衝區來存儲 ZIP 文件
    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for main_key, sub_dict in error_message_content.items():
            # 在每個 main_key 開始時，初始化 CSV 檔案的內容
            output = io.StringIO()
            csv_writer = csv.writer(output)
            csv_writer.writerow(["Error Message", "Row Index", "Invalid Values"])  # 表頭
            
            # 處理所有子項
            for sub_key, values in sub_dict.items():
                for sub_sub_key, sub_values in values.items():
                    print(f'sub_sub_key: {sub_sub_key}, sub_values: {sub_values}')

                    error_types = ['invalid_rows', 'blank_rows', 'zero_rows', 'invalid_content_rows', 'mismatched_day_rows', 'mismatched_month_rows', 'mismatched_year_rows']
                    for error_type in error_types:
                        if sub_values.get(error_type):
                            error_data = sub_values[error_type]
                            error_count = error_data.get('count', 0)
                            
                            if error_count > 0:
                                # 將錯誤資料寫入 CSV
                                for i in range(error_count):
                                    csv_writer.writerow([
                                        error_data.get("error_message", ""),
                                        error_data.get("indexes", [])[i],
                                        error_data.get("values", [])[i],
                                    ])

            # 將 CSV 內容轉換為 UTF-8-SIG 編碼
            encoded_csv = output.getvalue().encode('utf-8-sig')

            # 在 ZIP 中創建並寫入 CSV 檔案
            csv_filename = f"{main_key}_error_message.csv"
            zip_file.writestr(csv_filename, encoded_csv)
    
    # 重置緩衝區指針，為下載做準備
    zip_buffer.seek(0)
    
    # 返回 ZIP 文件給用戶
    return send_file(
        zip_buffer,
        mimetype="application/zip",
        as_attachment=True,
        download_name=f"project_{project_id}_error_message-{date.today()}.zip",
    )


@data_validation_bp.route('/download_all', methods=['GET'])
def download_all_tables():
    project_id = request.args.get('project_id')

    if not project_id:
        return {"error": "Missing project_id."}, 400
    
    project_name = Projects.query.filter_by(id=project_id).first().project_name

    # 查詢該 project 的所有 table_name，返回 tuple 格式
    table_names = TableHeader.query.filter_by(project_id=project_id).with_entities(TableHeader.table_name).all()
    table_names = [table_name for table_name, in table_names]  # 轉為列表，中間逗號不能省，用來解析 tuple

    if not table_names:
        return {"error": "No tables found for the given project."}, 404

    # 建立一個內存中的 ZIP 文件
    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for table_name in table_names:
            table_data = TableData.query.filter_by(project_id=project_id, table_name=table_name).order_by(TableData.row_id).all()
            if not table_data:
                continue

            table_header_entry = TableHeader.query.filter_by(project_id=project_id, table_name=table_name).first()
            headers = table_header_entry.table_header

            # 創建 CSV 文件內容
            output = io.StringIO()
            csv_writer = csv.DictWriter(output, fieldnames=headers)
            csv_writer.writeheader()

            for record in table_data:
                row = {header: record.data.get(header, "") for header in headers}
                csv_writer.writerow(row)

            # 將 CSV 文件內容轉為 UTF-8-SIG
            encoded_csv = output.getvalue().encode('utf-8-sig')

            # 將 CSV 文件寫入 ZIP
            zip_file.writestr(f"{table_name}-{date.today()}.csv", encoded_csv)

    # 重置 ZIP 文件指針
    zip_buffer.seek(0)

    # 返回壓縮文件
    return send_file(
        zip_buffer,
        mimetype="application/zip",
        as_attachment=True,
        download_name=f"{project_name}-{date.today()}.zip",
    )