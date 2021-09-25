// TO check where individual points are
// https://raw.githubusercontent.com/google/mediapipe/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png
LANDMARK_TOP = 10
LANDMARK_BOTTOM = 175
LANDMARK_CENTER = 1
LANDMARK_LEFT = 361
LANDMARK_RIGHT = 132

LANDMARK_MOUTH_LEFT = 61
LANDMARK_MOUTH_RIGHT = 291
LANDMARK_MOUTH_TOP = 0
LANDMARK_MOUTH_BOTTOM = 17

LANDMARK_LEFT_EYE_TOP = 159
LANDMARK_LEFT_EYE_BOTTOM = 145
LANDMARK_LEFT_EYEBROW = 66

LANDMARK_RIGHT_EYE_TOP = 386
LANDMARK_RIGHT_EYE_BOTTOM = 374
LANDMARK_RIGHT_EYEBROW = 296



// attach this to a cube, which will move in line with the head.
AFRAME.registerComponent('block-head', {
  schema: {
  },

  init: function() {

    //this.tick = AFRAME.utils.throttleTick(this.tick, 500, this);
    this.videoElement = document.getElementsByClassName('input_video')[0];

    // key geometric axes for shape...
    this.faceXAxis = new THREE.Vector3(1, 0, 0) // nod
    this.faceYAxis = new THREE.Vector3(0, 1, 0) // shake

    // used for working
    this.vectorA = new THREE.Vector3(0, 0, 0)
    this.vectorB = new THREE.Vector3(0, 0, 0)
    this.quaternionA = new THREE.Quaternion()
    this.quaternionB = new THREE.Quaternion()

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

    this.mouth = document.querySelector("#mouth")
    this.leftEye = document.querySelector("#left-eye")
    this.leftPupil = document.querySelector("#left-pupil")
    this.leftEyebrow = document.querySelector("#left-eyebrow")
    this.rightEye = document.querySelector("#right-eye")
    this.rightPupil = document.querySelector("#right-pupil")
    this.rightEyebrow = document.querySelector("#right-eyebrow")

  },

  vectorBetweenPoints: function(index1, index2, returnVector) {
    const vector1 = this.results.multiFaceLandmarks[0][index1]
    const vector2 = this.results.multiFaceLandmarks[0][index2]

    returnVector.subVectors(vector1, vector2)

    return (returnVector)
  },

  onResults: function(results) {

    this.results = results

    if (this.results.multiFaceLandmarks[0]) {

      this.vectorBetweenPoints(LANDMARK_BOTTOM, LANDMARK_TOP, this.faceYAxis)
      this.faceYLength = this.faceYAxis.length()
      this.faceYAxis.normalize()

      this.vectorBetweenPoints(LANDMARK_LEFT, LANDMARK_RIGHT, this.faceXAxis)
      this.faceXLength = this.faceXAxis.length()
      this.faceXAxis.normalize()

      this.animateMouth()
      this.animateEye(this.leftEye,
                      this.leftPupil,
                      LANDMARK_LEFT_EYE_TOP,
                      LANDMARK_LEFT_EYE_BOTTOM)
      this.animateEye(this.rightEye,
                      this.rightPupil,
                      LANDMARK_RIGHT_EYE_TOP,
                      LANDMARK_RIGHT_EYE_BOTTOM)
      this.animateEyebrow(this.leftEyebrow,
                      LANDMARK_LEFT_EYEBROW,
                      LANDMARK_LEFT_EYE_TOP,
                      LANDMARK_LEFT_EYE_BOTTOM)
      this.animateEyebrow(this.rightEyebrow,
                      LANDMARK_RIGHT_EYEBROW,
                      LANDMARK_RIGHT_EYE_TOP,
                      LANDMARK_RIGHT_EYE_BOTTOM)

      // get quaternion that makes the y-axis align
      this.vectorA.set(0, 1, 0)
      this.quaternionA.setFromUnitVectors(this.vectorA, this.faceYAxis)

      // any further rotation needed to make X axis align?

      this.vectorA.set(1, 0, 0)
      this.vectorA.applyQuaternion(this.quaternionA)

      this.quaternionB.setFromUnitVectors(this.vectorA, this.faceXAxis)

      this.el.object3D.quaternion.multiplyQuaternions(this.quaternionA,
                                                      this.quaternionB)


      //const material = this.el.getObject3D('mesh').material;
      //material.map.magFilter = THREE.NearestFilter;
    }
  },

  animateMouth: function() {

    let height = this.vectorBetweenPoints(LANDMARK_MOUTH_TOP,
                                          LANDMARK_MOUTH_BOTTOM,
                                          this.vectorA).length()
    height = height / this.faceYLength

    let width = this.vectorBetweenPoints(LANDMARK_MOUTH_LEFT,
                                         LANDMARK_MOUTH_RIGHT,
                                         this.vectorA).length()
    width - width / this.faceXLength

    // apply scale factors to mouth (but with adjustments)
    this.mouth.object3D.scale.y = height - 0.06
    this.mouth.object3D.scale.x = width * 6 - 0.2
  },

  animateEye: function(eye, pupil, top, bottom) {

    let height = this.vectorBetweenPoints(top,
                                          bottom,
                                          this.vectorA).length()
    height = height / this.faceYLength

    // apply scale factors to eye (but with adjustments to match cartoon look)
    eye.object3D.scale.y = height * 6 - 0.2

    // if eye closes, conceal pupil
    if (eye.object3D.scale.y <= 0.05) {
      pupil.object3D.scale.y = eye.object3D.scale.y
    }
    else {
      pupil.object3D.scale.y = 0.05
    }
  },

  animateEyebrow: function(eyebrow, position, eyeTop, eyeBottom) {

    let height1 = this.vectorBetweenPoints(position,
                                           eyeTop,
                                           this.vectorA).length()
    height1 = height1 / this.faceYLength

    let height2 = this.vectorBetweenPoints(position,
                                           eyeBottom,
                                           this.vectorA).length()
    height2 = height2 / this.faceYLength

    // adjust eyebrow position from default of y=0.15
    eyebrow.object3D.position.y = height2 - 0.05
  }

});

AFRAME.registerComponent('box-uvs', {

  // 4 values in each array are:
  //bottom left x, y, top left x, y.
  schema: {
    front: {type: 'array', default: '0,0,1,1'},
    back: {type: 'array', default: '0,0,1,1'},
    top: {type: 'array', default: '0,0,1,1'},
    bottom: {type: 'array', default: '0,0,1,1'},
    left: {type: 'array', default: '0,0,1,1'},
    right: {type: 'array', default: '0,0,1,1'}
  },

  init() {

    function uvArrayFromData(face, combinedUVs, offset) {
      // first: bottom right, bottom left, top right.
      combinedUVs.set([face[0], face[3], face[0], face[1], face[2], face[3]], offset)
      combinedUVs.set([face[0], face[1], face[2], face[1], face[2], face[3]], offset + 6)
    }

    // to modify the uvs without messing up other boxes, we need a new geometry.
    this.geometry = new THREE.BufferGeometry

    this.geometry.copy(this.el.getObject3D('mesh').geometry);
    const combinedUVs = new Float32Array(72)
    const frontUVs = uvArrayFromData(this.data.front, combinedUVs, 48)
    const backUVs = uvArrayFromData(this.data.back, combinedUVs, 60)
    const topUVs = uvArrayFromData(this.data.top, combinedUVs, 24)
    const bottomUVs = uvArrayFromData(this.data.bottom, combinedUVs, 36)
    const leftUVs = uvArrayFromData(this.data.left, combinedUVs, 12)
    const rightUVs = uvArrayFromData(this.data.right, combinedUVs, 0)

    this.geometry.setAttribute('uv', new THREE.BufferAttribute(combinedUVs, 2));
    this.geometry.uvsNeedUpdate = true;
    this.el.getObject3D('mesh').geometry = this.geometry
  }
});

AFRAME.registerComponent('material-pixellated', {
  schema: {
    src: { type: 'selector'}
  },

  init() {
  },
  update () {
    const texture = new THREE.TextureLoader().load(this.data.src.currentSrc)
    texture.magFilter = THREE.NearestFilter;

    console.log(texture)

    const material = new THREE.MeshStandardMaterial({
      map: texture
    })
    this.el.getObject3D('mesh').material = material;
  }
});
