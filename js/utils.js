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
