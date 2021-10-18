//This was written in 2014 code quality is bad
var requestAnimationFrame =
	window.requestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame ||
	window.msRequestAnimationFrame ||
	window.oRequestAnimationFrame ||
	function(callback) {
		return setTimeout(callback, 1);
	};
var sourceX = 300,
	sourceY = 300;
var renderer = PIXI.autoDetectRenderer(window.innerWidth,window.innerHeight, { backgroundColor: 0xffffff, antialias: true });
document.getElementById('sim').appendChild(renderer.view);
        // Create the main stage for your display objects
var stage = new PIXI.Container();

var wall = new PIXI.Graphics();
var rays = new PIXI.Graphics();
var waves = new PIXI.Graphics();
var filter = new PIXI.filters.BlurFilter();
filter.blur = 10;
filter.passes = 2;
	
 
var canvas = document.getElementById('canvas')
var svg = document.getElementById('svg')
var width = canvas.width
var context = canvas.getContext('2d');

var pointsToSVGPath = function(points) {
	var pathString = 'M' + points[0].x + ' ' + points[0].y
	points.shift()
	points.forEach(function(point) {
		pathString += ' L' + point.x + ' ' + point.y
	})
	return pathString
}


var distance = function(x1, x2, y1, y2) {
	return Math.sqrt(Math.pow((x2 - x1), 2) + Math.pow((y2 - y1), 2))
}

var source1;
var pulse1;
var animation;
var pulses = []
for (var i=0; i<30; i++){
	pulses.push({t:i/2, a:1})
}


var domain = {
	init: function() {
		var domain = this
		function drawBezier(){
			domain.curve = new Bezier(domain.curveControlPoints)
			domain.curveSVG = document.getElementById('curve')
			var points = domain.curve.getLUT()
			var pathString = pointsToSVGPath(points)
			domain.curveSVG.setAttribute('d', pathString)
		}
		drawBezier()
		
		this.curveControlPoints.forEach(function(point,index){
			var handle = document.createElementNS("http://www.w3.org/2000/svg",'circle')
			var clickPoint;
			var initx = point.x;
			var inity = point.y
			handle.setAttribute('r',10)
			handle.setAttribute('cx', point.x)
			handle.setAttribute('cy', point.y)
			handle.setAttribute('fill', 'red')
			function mouseUp(){
				document.removeEventListener('mouseup', mouseUp)
				document.removeEventListener('mousemove', mouseMove)
				var controlPoint = domain.curveControlPoints[index]
				
				initx = controlPoint.x
				inity = controlPoint.y
			}
			var mouseMove = function(event){
				document.addEventListener('mouseup', mouseUp)
				var controlPoint = domain.curveControlPoints[index]
				controlPoint.x = initx+event.x-clickPoint.x
				controlPoint.y = inity+event.y-clickPoint.y
				handle.setAttribute('cx', controlPoint.x)
				handle.setAttribute('cy', controlPoint.y)
				source1 = new Source(sourceX,sourceY,1)
				if (showRaysCheckbox.checked){
					source1.drawRays()
				}
					//source1.drawRays()
				createPulses(pulses,source1)
				drawBezier()
			}
			var mouseDown = function(event){
				clickPoint = {x:event.x,y:event.y}
				
				document.addEventListener('mousemove', mouseMove)
				//cancelAnimationFrame(animation)
			}
			handle.addEventListener('mousedown', mouseDown)
			
			
			svg.appendChild(handle)
		})
		
	},

	curveControlPoints: [{
		x: 100,
		y: 500
	}, {
		x: 100,
		y: 100
	}, {
		x: 500,
		y: 100
	}],
	speed: 50,
}
domain.init()







function Source(posx, posy, signal) {
	this.radialRes = 100;
	this.maxReflections = 4;
	this.dist = 1000; //maximum reflection distance
	this.rayData = []
		//calculate
	var angleOffset = Math.PI * 2 / this.radialRes
	
	for (var i = 0; i < this.radialRes+1; i++) {
		var angle = angleOffset * i,
			vx = Math.cos(angle) * domain.speed,
			vy = Math.sin(angle) * domain.speed;

		var rayPath = [{x:posx,y:posy,vx:vx,vy:vy,t:0}]
		var sourcex = posx;
		var sourcey = posy;
		var ref = 0
		for (var r = 0; r < this.maxReflections; r++) {
			var prevRay = rayPath[r]
			var line = {
				p1: {
					x: sourcex,
					y: sourcey
				},
				p2: {
					x: prevRay.vx*this.dist,
					y: prevRay.vy*this.dist
				}
			};
			
			var intersectionBezierT = domain.curve.intersects(line)[0]
			if (intersectionBezierT === undefined){
				intersectionTime = 2000
				
				intersectionPoint = {
					x:intersectionTime*prevRay.vx+prevRay.x,
					y:intersectionTime*prevRay.vy+prevRay.y
				}
			} else {
				var intersectionPoint = domain.curve.get(intersectionBezierT)
				var intersectionTime = prevRay.t+distance(sourcex, intersectionPoint.x, sourcey, intersectionPoint.y)/domain.speed
			
				//calculate new velocity vector
				var normal = domain.curve.normal(intersectionBezierT)
				intersectionPoint.x+=normal.x
				intersectionPoint.y+=normal.y
				
				var VdotN = prevRay.vx * normal.x + prevRay.vy * normal.y
				var newVx = -2*VdotN*normal.x+prevRay.vx
				var newVy = -2*VdotN*normal.y+prevRay.vy
			}
			
			rayPath.push({
				x:intersectionPoint.x,
				y:intersectionPoint.y,
				vx:newVx,
				vy:newVy,
				t:intersectionTime,
				ref:ref
			})
			ref++//increment reflection count
			sourcex = intersectionPoint.x 
			sourcey = intersectionPoint.y 
			angle = Math.atan2(newVy/newVx)
		}
		this.rayData.push(rayPath)
	}
	this.drawRays = function(){
		rays.clear()
		for (var j=1; j<this.rayData.length; j+=2){
			var ray = this.rayData[j]
			for (var i=1;i<ray.length; i++){
				
				rays.lineStyle(3,'0x00AA00',.1)
				rays.moveTo(ray[i-1].x, ray[i-1].y)
				rays.lineTo(ray[i].x,ray[i].y)
			}
		}
		stage.addChild(rays)
	}
	this.clearRays = function(){
		rays.clear()
	}
}






var Pulse = function(amplitude, source){
	var pulse = this
	this.refArray = new Uint8Array(source.rayData.length).fill(0);
	
	this.step = function(t) {
		
		var getPos = function(rayPath,index){
			var reflections = pulse.refArray[index]
			var rayIndex=pulse.refArray[index]
			
			if (rayPath.length === 1 || t < rayPath[rayIndex+1].t){
				var dtR = t-rayPath[rayIndex].t//time since reflection
				return {
					x:rayPath[rayIndex].x+dtR*rayPath[rayIndex].vx,
					y:rayPath[rayIndex].y+dtR*rayPath[rayIndex].vy
				}
			} else {
				
				var pos = {
					x:rayPath[rayIndex+1].x+dtR*rayPath[rayIndex+1].vx,
					y:rayPath[rayIndex+1].y+dtR*rayPath[rayIndex+1].vy
				}
				pulse.refArray[index] ++
				
				return pos
			}
		}
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.beginPath();
		
		//waves.beginFill(0x0000FF);
		var lastRay = source.rayData[source.rayData.length-1]
		var lastPos = getPos(lastRay,0)
		
		context.moveTo(lastPos.x, lastPos.y)
		waves.moveTo(lastPos.x, lastPos.y);
		
		source.rayData.forEach(function(ray,index) {
			var pos = getPos(ray, index)
			context.lineTo(pos.x, pos.y)
			
			if (index ===0||pulse.refArray[index] !== pulse.refArray[index-1]){
				waves.moveTo(pos.x, pos.y);
			} else {
				
				waves.lineStyle(1,'0x0000ff',.3*amplitude)
				waves.lineTo(pos.x, pos.y);
			}
			
		})
		
		//waves.filters = [filter]
		context.lineWidth = 2;
		context.strokeStyle = 'blue';
		//context.stroke();
		
		

 

        stage.addChild(waves);
	}

}

source1 = new Source(sourceX,sourceY,1)
//var pulses = [{t:0,a:1}, {t:0.5,a:1},{t:1,a:1},{t:1.5,a:1}]



function createPulses(pulses,source){
	pulses.forEach(function(pulse){
		
		pulse.pulse = new Pulse(pulse.a,source1)
	})
}


createPulses(pulses, source1)

function stepPulses(time, pulses){
	pulses.forEach(function(pulse){
		if (time>pulse.t){
			pulse.pulse.step(time-pulse.t)
		}
	})
}

var startTime = new Date().getTime();
function draw() {
	var now = new Date().getTime(),
	time = (now-startTime)/1000
	animation = requestAnimationFrame(draw);
	waves.clear()
	
	stepPulses(time, pulses)
	//pulses[0].pulse.step(time)
	
	renderer.render(stage);
}
var showWavesButton = document.getElementById('waves-button')
showWavesButton.addEventListener('click', waveButtonHandler)
function waveButtonHandler(){
	createPulses(pulses,source1)
	startTime = new Date().getTime()
}
var showRaysCheckbox = document.getElementById('rays-checkbox')
showRaysCheckbox.addEventListener('click', raysHandler)
function raysHandler(){
	if (showRaysCheckbox.checked){
		source1.drawRays()
	} else {
		source1.clearRays()
	}
}
draw()

