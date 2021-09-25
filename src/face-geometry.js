AFRAME.registerComponent('track-face', {
  schema: {
    mirror: {type: 'boolean', default: false}
  },

  init: function() {

    //this.tick = AFRAME.utils.throttleTick(this.tick, 500, this);

    this.videoElement = document.getElementsByClassName('input_video')[0];

    // do we need the "locateFile" bits?  Not sure...leave in for now.
    this.faceMesh = new FaceMesh({locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`;
    }});
    console.log(this.faceMesh);
    this.faceMesh.setOptions({
      maxNumFaces: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    this.onResultsBound = this.onResults.bind(this);
    this.faceMesh.onResults(this.onResultsBound);

    this.camera = new Camera(this.videoElement, {
      onFrame: async () => {
        await this.faceMesh.send({image: this.videoElement});
      },
      //width: 1280,
      //height: 720
    });
    this.camera.start();

    this.points = [];
    for (ii = 0; ii < 468; ii++) {

      var point  = document.createElement('a-text');
      point.setAttribute('position', '0 0 0')
      point.setAttribute('scale', '0.05 0.05 0.05')
      point.setAttribute('value', `${ii}`);
      point.setAttribute('color', 'grey')
      this.el.appendChild(point);

      this.points.push(point);
    }

    this.debugText = document.createElement('a-text');
    this.debugText.setAttribute('position', '-1 -1 -2')
    this.debugText.setAttribute('value', "Debug Text");
    this.debugText.setAttribute('scale', '0.5 0.5 0.5')
    this.debugText.setAttribute('color', 'red')
    this.el.appendChild(this.debugText);

  },

  onResults: function(results) {

    if (results.multiFaceLandmarks[0]) {

      var minX = 100;
      var maxX = -100;
      var minY = 100;
      var maxY = -100;
      var minZ = 100;
      var maxZ = -100;

      for (ii = 0; ii < 468; ii++) {
        const marker = results.multiFaceLandmarks[0][ii]
        const mirror = this.data.mirror ? -1 : 1
        if (marker) {
          this.points[ii].object3D.position.x = mirror * marker.x;
          this.points[ii].object3D.position.y = -marker.y;
          this.points[ii].object3D.position.z = -marker.z;

          if (marker.x > maxX) {maxX = marker.x}
          if (marker.x < minX) {minX = marker.x}
          if (marker.y > maxY) {maxY = marker.y}
          if (marker.y < minY) {minY = marker.y}
          if (marker.z > maxZ) {maxZ = marker.z}
          if (marker.z < minZ) {minZ = marker.z}
        }
      }

      this.debugText.setAttribute('value',
                                  `x-range: ${minX.toFixed(2)} to ${maxX.toFixed(2)}
                                   y-range: ${minY.toFixed(2)} to ${maxY.toFixed(2)}
                                   z-range: ${minZ.toFixed(2)} to ${maxZ.toFixed(2)}`);
    }
  }

});
