"use strict";
/* global dat:false */

var Task = require("./task");

function Controller(graph) {
	this.graph = graph;

	this.gui = new dat.GUI();
	var defaultControls = {
		add: function() {
			this.graph.sortTasks();

			var tasks = this.graph.tasks;
			var nextId = tasks.length + 1;
			for(var i = 0; i < tasks.length; i++) {
				if(tasks[i].id !== i+1) {
					nextId = i+1;
					break;
				}
			}

			var canvas = this.graph.canvas;
			var taskX = canvas.width / 2;
			var taskY = canvas.height / 2;
			var task = new Task(taskX, taskY, nextId, 5);

			this.graph.tasks.push(task);
			this.graph.criticalPathNeedsUpdate = true;
			task.focused = true;
			this.focusTask(task);
		}.bind(this)
	};
	this.gui.add(defaultControls, "add");
	this._taskControls = [];
}

Controller.prototype = {
	constructor: Controller,

	focusTask: function(task) {
		this.unfocus();

		var nameControl = this.gui.add(task, "name");

		var idControl = this.gui.add(task, "id").min(1).step(1);

		var timeControl = this.gui.add(task, "time").min(1).max(100).step(1);
		timeControl.onChange(function() {
			this.graph.criticalPathNeedsUpdate = true;
		}.bind(this));
		
		this._taskControls = [
			nameControl,
			idControl,
			timeControl
		];
	},

	unfocus: function() {
		this._taskControls.forEach(function(control) {
			this.gui.remove(control);
		}.bind(this));
		this._taskControls = [];
	}
};

module.exports = Controller;

