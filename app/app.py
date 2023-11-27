from flask import Flask, render_template, request, redirect, session
import os
import pandas as pd

app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(24)

@app.route('/')
def homepage():
    return render_template('base.html')

@app.route('/data-template', methods=['GET', 'POST'])
def data_template():
    if request.method == 'POST':
        data = request.get_json()
        checkbox_names = data['checkbox_names']
        app.logger.info(f'checkbox_names in data_template: {checkbox_names}')
        session['checkbox_names'] = checkbox_names
        return redirect('/data-edit')
    else:
        return render_template('data-template.html')

@app.route('/data-edit', methods=['GET', 'POST'])
def data_edit():
    checkbox_names = session.get('checkbox_names', [])
    app.logger.info(f'checkbox_names in data_edit: {checkbox_names}')
    return render_template('data-edit.html', checkbox_names=checkbox_names)

@app.route('/data-clean', methods=['GET', 'POST'])
def data_clean():
    if request.method == 'POST':
        data = request.get_json()
        table_header = data['table_header']
        table_data = data['table_data']
        # app.logger.info(f'header: {table_header}, data: {table_data}')

        # *****開始清理流程*****
        df = pd.DataFrame(table_data, columns=table_header)
        app.logger.info(df)
        
    return render_template('data-clean.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5555)
