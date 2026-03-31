from flask import Blueprint, render_template, request
views = Blueprint(__name__, "views")

@views.route("/Project/")
def homeS():
    return render_template("/project.html", key="")

@views.route("/Project/project")
def SearchPage_URL():
    args = request.args
    search = args.get('key')
    return render_template("/project.html", key=search)
