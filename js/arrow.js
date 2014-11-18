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
