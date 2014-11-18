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
