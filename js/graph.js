"use strict";
/* global Mousetrap:false */

function Graph(canvas, controller) {
	this.canvas = canvas;
	this.controller = controller;
	this.tasks = [];

	this.selectedTask = null;
	this.criticalPathNeedsUpdate = true;

	this._resizeCanvas();
	window.addEventListener("resize", function() {
		this._resizeCanvas();
	}.bind(this), false);

	var mousemove = function(event) {
		var mousePos = this._getMousePos(event);
		this.selectedTask.x = mousePos.x;
		this.selectedTask.y = mousePos.y;
	}.bind(this);

	this.canvas.addEventListener("mousedown", function mousedown(event) {
		if(event.ctrlKey) {
			this._ctrlClick(event);
			return;
		}

		if(this.selectedTask) {
			this.selectedTask.selected = false;
			this.selectedTask = null;
		}
		this.controller.unfocus();

		var mousePos = this._getMousePos(event);
		var task = this.getTaskAt(mousePos.x, mousePos.y);

		if(!task) return;
		this.selectedTask = task;
		task.selected = true;
		task.repositioning = true;

		this.controller.focusTask(task);
		this.canvas.addEventListener("mousemove", mousemove, false);
	}.bind(this), false);

	this.canvas.addEventListener("mouseup", function mouseup(event) {
		this.canvas.removeEventListener("mousemove", mousemove);
		if(this.selectedTask) {
			this.selectedTask.repositioning = false;
		}
	}.bind(this), false);

	Mousetrap.bind(["del"], this.deleteSelected.bind(this));
}

Graph.prototype = {
	constructor: Graph,

	getTaskAt: function(x, y) {
		var Task = require("./task");
		var radius = Task.radius;

		var utils = require("./utils.js");
		for(var i = 0; i < this.tasks.length; i++) {
			var task = this.tasks[i];
			var distance = utils.distance(x, y, task.x, task.y);
			if(distance <= radius) {
				return task;
			}
		}
		return null;
	},

	deselectAll: function() {
		this.tasks.forEach(function(task) {
			task.selected = false;
		});
		this.selectedTask = null;
	},

	draw: function() {
		var context = this.canvas.getContext("2d");
		context.clearRect(0, 0, this.canvas.width, this.canvas.height);

		var criticalPath = require("./utils").getCriticalPath(this.tasks);
		if(this.criticalPathNeedsUpdate) {
			var criticalTasks = new Set(criticalPath);
			this.tasks.forEach(function(task) {
				if(criticalTasks.has(task)) {
					task.critical = true;
				} else {
					task.critical = false;
				}
			});

			this.criticalPathNeedsUpdate = false;
		}

		var arrow = new (require("./arrow"))();
		this.tasks.forEach(function(task) {
			if(!task.repositioning) {
				task.calcVelocity();
				task.x += task.vX;
				task.y += task.vY;
			}
			task.draw(context);

			task.children.forEach(function(child) {
				arrow.connectTasks(child, task);
				arrow.shapeNeedsUpdate = true;

				var criticalChild = criticalPath[criticalPath.indexOf(task) - 1] || null;
				arrow.critical = task.critical && criticalChild === child;
				arrow.draw(context);
			});
		});
	},
	
	sortTasks: function() {
		this.tasks.sort(function sortById(a, b) {
			return a.id - b.id;
		});
	},

	_resizeCanvas: function() {
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
	},

	_getMousePos: function(event) {
		var rect = this.canvas.getBoundingClientRect();
		return {
			x: event.clientX - rect.left,
			y: event.clientY - rect.top
		};
	},

	_ctrlClick: function(event) {
		// Connect current task to clicked task
		if(!this.selectedTask) return;

		var mousePos = this._getMousePos(event);
		var clickedTask = this.getTaskAt(mousePos.x, mousePos.y);
		if(!clickedTask || this.selectedTask === clickedTask) return;

		this.selectedTask.addParent(clickedTask);
		this.criticalPathNeedsUpdate = true;
	},

	deleteSelected: function() {
		if(!this.selectedTask) return;

		var children = [];
		this.selectedTask.children.forEach(function(child) {
			children.push(child);
		});
		children.forEach(function(child) {
			this.selectedTask.disconnectFrom(child);
		}.bind(this));

		var parents = [];
		this.selectedTask.parents.forEach(function(parent) {
			parents.push(parent);
		});
		parents.forEach(function(parent) {
			this.selectedTask.disconnectFrom(parent);
		}.bind(this));

		this.tasks.splice(this.tasks.indexOf(this.selectedTask), 1);

		this.controller.unfocus();
		this.criticalPathNeedsUpdate = true;
	}
};

module.exports = Graph;
