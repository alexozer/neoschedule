"use strict";

var utils = require("./utils");

function Task(x, y, id, time) {
	this.x = x;
	this.y = y;

	this.vX = 0;
	this.vY = 0;

	this.name = "Unnamed";
	this.id = id;
	this.time = time;

	this.children = new Set();
	this.parents = new Set();

	this.selected = false;
	this.critical = false;

	this.repositioning = false;
}

Task.prototype = {
	constructor: Task,

	draw: function(context) {
		// Circle
		context.beginPath();
		context.arc(this.x, this.y, Task.radius, 0, 2 * Math.PI);
		context.fillStyle = Task.fillColor;
		context.fill();

		context.lineWidth = Task.lineWidth;
		if(this.selected) {
			context.strokeStyle = Task.selectedColor;
		} else {
			if(this.critical) {
				context.strokeStyle = Task.criticalColor;
			} else {
				context.strokeStyle = Task.neutralColor;
			}
		}
		context.stroke();

		// Text

		// Time
		context.font = Task.timeFont;
		context.textAlign = "center";
		context.fillStyle = "#000000";
		context.fillText(this.time, this.x, this.y);

		// ID
		context.font = Task.idFont;
		context.fillText("T" + this.id, this.x, this.y + 0.75 * Task.radius);
	},

	disconnectFrom: function(task) {
		// If this is parent of task
		this.children.delete(task);
		task.parents.delete(this);

		// If this is child of task
		this.parents.delete(task);
		task.children.delete(this);
	},

	addParent: function(parent) {
		if(this.parents.has(parent) || this.children.has(parent)) {
			return;
		}
		this.parents.add(parent);
		parent.children.add(this);
	},

	calcVelocity: function() {
		this.vX = 0;
		this.vY = 0;
		this._assignAttraction(this.children);
		this._assignAttraction(this.parents);

		var theta = Math.atan(this.vY / this.vX);

		////var fricX = Math.abs(Task.friction * Math.cos(theta));
		////this.vX = utils.lower(this.vX, fricX);
		//this.vX *= 0.25;

		////var fricY = Math.abs(Task.friction * Math.sin(theta));
		////this.vY = utils.lower(this.vY, fricY);
		//this.vY *= 0.25;
	},
	
	_assignAttraction: function(tasks) {
		tasks.forEach(function(task) {
			var distance = utils.distance(this.x, this.y, task.x, task.y);
			var attraction = Task.G*utils.sign(distance - Task.neutralDistance) * 
				Math.pow(distance - Task.neutralDistance, 2);

			var theta = Math.atan((this.y - task.y) / (task.x - this.x));
			if(task.x < this.x) theta += Math.PI;

			this.vX += Math.cos(theta) * attraction;
			this.vY -= Math.sin(theta) * attraction;
		}.bind(this));
	}
};

Task.lineWidth = 3;
Task.fillColor = "#2aa198";
Task.neutralColor = "#000000";
Task.criticalColor = "#d70000";
Task.selectedColor = "#6c71c4";
Task.radius = 30;
Task.timeFont = "20pt Calibri";
Task.idFont = "12pt Calibri";
Task.friction = 1;
Task.G = 10e-4;
Task.neutralDistance = 300;

module.exports = Task;
