from flask import jsonify
from database import db
from data_template.model import ErrorMessages

def save_table_stats(project_id, content):
    new_stat = ErrorMessages(project_id=project_id, 
                              content=content)
    db.session.add(new_stat)
    db.session.commit()

def get_table_stats(project_id):
    stat = ErrorMessages.query.filter_by(project_id=project_id).first()
    return jsonify(stat.content)

def delete_table_stats(project_id):
    # 刪除所有記錄
    try:
        db.session.query(ErrorMessages).delete()  # 刪除所有 ErrorMessages 記錄
        db.session.commit() 
        message = '所有資料驗證的錯誤訊息資料已成功刪除'
        return jsonify({"message": message}), 200
    except Exception as e:
        db.session.rollback()  # 如果出錯，回滾事務
        error_message = f'刪除資料驗證的錯誤訊息失敗: {str(e)}'
        print(error_message)
        return jsonify({"error": error_message}), 500 
