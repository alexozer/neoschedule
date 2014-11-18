(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/home/alex/code/js/scheduling/js/arrow.js":[function(require,module,exports){
"use strict";

function Arrow(x1, y1, x2, y2) {
	this.x1 = x1 !== undefined ? x1 : 0;
	this.y1 = y1 !== undefined ? y1 : 0;
	this.x2 = x2 !== undefined ? x2 : 100;
	this.y2 = y2 !== undefined ? y2 : 100;

	this.lineWidth = 5;
	this.critical = false;

	this.shapeNeedsUpdate = true;
}

Arrow.prototype = {
	constructor: Arrow,

	_assignHead: function() {
		var direction = Math.atan((this.y1 - this.y2) / (this.x2 - this.x1));
		if(this.x2 < this.x1) direction += Math.PI;

		var leftDir = direction + 0.75 * Math.PI;
		leftDir %= 2 * Math.PI;

		this._leftX = this.x2 + Math.cos(leftDir) * Arrow.headLength;
		this._leftY = this.y2 - Math.sin(leftDir) * Arrow.headLength;

		var rightDir = direction + (2 * Math.PI) - 0.75 * Math.PI;
		rightDir %= 2 * Math.PI;

		this._rightX = this.x2 + Math.cos(rightDir) * Arrow.headLength;
		this._rightY = this.y2 - Math.sin(rightDir) * Arrow.headLength;
	},
		
	draw: function(context) {
		if(this.shapeNeedsUpdate) {
			this._assignHead();
			this.shapeNeedsUpdate = false;
		}
		context.beginPath();

		context.moveTo(this.x1, this.y1);
		context.lineTo(this.x2, this.y2);

		context.moveTo(this._leftX, this._leftY);
		context.lineTo(this.x2, this.y2);

		context.moveTo(this._rightX, this._rightY);
		context.lineTo(this.x2, this.y2);

		context.lineWidth = this.lineWidth;
		context.strokeStyle = this.critical ? Arrow.criticalColor : Arrow.neutralColor;
		context.lineCap = "round";

		context.stroke();
	},

	connectTasks: function(child, parent) {
		this.x1 = child.x;
		this.y1 = child.y;
		this.x2 = parent.x;
		this.y2 = parent.y;

		var direction = Math.atan((this.y1 - this.y2) / (this.x2 - this.x1));
		if(this.x2 < this.x1) direction += Math.PI;

		var radius = Object.getPrototypeOf(child).constructor.radius + 10;
		var xSpace = Math.cos(direction) * radius;
		var ySpace = Math.sin(direction) * radius;
		this.x1 += xSpace;
		this.x2 -= xSpace;
		this.y1 -= ySpace;
		this.y2 += ySpace;

		this.shapeNeedsUpdate = true;
	}
};

Arrow.headLength = 20;
Arrow.neutralColor = "#0087ff";
Arrow.criticalColor = "#d70000";

module.exports = Arrow;

},{}],"/home/alex/code/js/scheduling/js/controller.js":[function(require,module,exports){
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


},{"./task":"/home/alex/code/js/scheduling/js/task.js"}],"/home/alex/code/js/scheduling/js/graph.js":[function(require,module,exports){
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

},{"./arrow":"/home/alex/code/js/scheduling/js/arrow.js","./task":"/home/alex/code/js/scheduling/js/task.js","./utils":"/home/alex/code/js/scheduling/js/utils.js","./utils.js":"/home/alex/code/js/scheduling/js/utils.js"}],"/home/alex/code/js/scheduling/js/main.js":[function(require,module,exports){
"use strict";
/* global dat:false */

// Stats
var stats = new (require("./stats.min"))();
stats.domElement.style.position = "absolute";
stats.domElement.style.right = "0px";
stats.domElement.style.bottom = "0px";
document.body.appendChild(stats.domElement);

// Controller
var controller = new (require("./controller"))();

// Graph
var graph = new (require("./graph"))(document.getElementById("canvas"), controller);
controller.graph = graph;

// Render loop
function render() {
	stats.begin();

	graph.draw();

	stats.end();
	requestAnimationFrame(render);
}
render();

},{"./controller":"/home/alex/code/js/scheduling/js/controller.js","./graph":"/home/alex/code/js/scheduling/js/graph.js","./stats.min":"/home/alex/code/js/scheduling/js/stats.min.js"}],"/home/alex/code/js/scheduling/js/stats.min.js":[function(require,module,exports){
// stats.js - http://github.com/mrdoob/stats.js
var Stats=function(){var l=Date.now(),m=l,g=0,n=Infinity,o=0,h=0,p=Infinity,q=0,r=0,s=0,f=document.createElement("div");f.id="stats";f.addEventListener("mousedown",function(b){b.preventDefault();t(++s%2)},!1);f.style.cssText="width:80px;opacity:0.9;cursor:pointer";var a=document.createElement("div");a.id="fps";a.style.cssText="padding:0 0 3px 3px;text-align:left;background-color:#002";f.appendChild(a);var i=document.createElement("div");i.id="fpsText";i.style.cssText="color:#0ff;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px";
i.innerHTML="FPS";a.appendChild(i);var c=document.createElement("div");c.id="fpsGraph";c.style.cssText="position:relative;width:74px;height:30px;background-color:#0ff";for(a.appendChild(c);74>c.children.length;){var j=document.createElement("span");j.style.cssText="width:1px;height:30px;float:left;background-color:#113";c.appendChild(j)}var d=document.createElement("div");d.id="ms";d.style.cssText="padding:0 0 3px 3px;text-align:left;background-color:#020;display:none";f.appendChild(d);var k=document.createElement("div");
k.id="msText";k.style.cssText="color:#0f0;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px";k.innerHTML="MS";d.appendChild(k);var e=document.createElement("div");e.id="msGraph";e.style.cssText="position:relative;width:74px;height:30px;background-color:#0f0";for(d.appendChild(e);74>e.children.length;)j=document.createElement("span"),j.style.cssText="width:1px;height:30px;float:left;background-color:#131",e.appendChild(j);var t=function(b){s=b;switch(s){case 0:a.style.display=
"block";d.style.display="none";break;case 1:a.style.display="none",d.style.display="block"}};return{REVISION:12,domElement:f,setMode:t,begin:function(){l=Date.now()},end:function(){var b=Date.now();g=b-l;n=Math.min(n,g);o=Math.max(o,g);k.textContent=g+" MS ("+n+"-"+o+")";var a=Math.min(30,30-30*(g/200));e.appendChild(e.firstChild).style.height=a+"px";r++;b>m+1E3&&(h=Math.round(1E3*r/(b-m)),p=Math.min(p,h),q=Math.max(q,h),i.textContent=h+" FPS ("+p+"-"+q+")",a=Math.min(30,30-30*(h/100)),c.appendChild(c.firstChild).style.height=
a+"px",m=b,r=0);return b},update:function(){l=this.end()}}};"object"===typeof module&&(module.exports=Stats);

},{}],"/home/alex/code/js/scheduling/js/task.js":[function(require,module,exports){
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

},{"./utils":"/home/alex/code/js/scheduling/js/utils.js"}],"/home/alex/code/js/scheduling/js/utils.js":[function(require,module,exports){
module.exports.distance = function(x1, y1, x2, y2) {
	return Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2));
};

module.exports.getCriticalPath = function(tasks) {
	var endTasks = getEndTasks(tasks);

	// Trace forward to find worst path

	var maxTime = 0;
	var worstPath = [];

	var recurse = function(task, alreadyChecked, currPath, totalTime) {
		if(alreadyChecked.has(task)) throw new Error("Loop detected in schedule");

		alreadyChecked.add(task);
		currPath.push(task);
		totalTime += task.time;

		if(task.children.size === 0) {
			if(totalTime > maxTime) {
				maxTime = totalTime;
				worstPath = currPath.slice(0);
			}
		} else {
			task.children.forEach(function(child) {
				recurse(child, alreadyChecked, currPath, totalTime);
			});
		}

		alreadyChecked.delete(task);
		currPath.pop();
	};

	endTasks.forEach(function(task) {
		var alreadyChecked = new Set();
		var currPath = [];

		recurse(task, alreadyChecked, currPath, 0);
	});

	return worstPath.reverse();
};

function getEndTasks(startTasks) {
	var endTasks = new Set();
	startTasks.forEach(function(task) {
		if(task.parents.size === 0) {
			endTasks.add(task);
		}
	});
	return endTasks;
}

module.exports.sign = function(x) {
	return x > 0 ? 1 : ((x < 0) ? -1 : 0);
};

module.exports.lower = function(x, diff) {
	var origSign = module.exports.sign(x);
	if(x > 0) {
		x -= diff;
	} else if(x < 0) {
		x += diff;
	}
	if(module.exports.sign(x) !== origSign) x = 0;
	
	return x;
};

},{}]},{},["/home/alex/code/js/scheduling/js/main.js"]);
