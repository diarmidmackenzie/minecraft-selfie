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

const VISIBILITY_THRESHOLD = 0.25

// used in working.
const BH = {}
BH.vectorA = new THREE.Vector3()
BH.vectorB = new THREE.Vector3()
BH.vectorC = new THREE.Vector3()
BH.vectorD = new THREE.Vector3()
BH.quaternionA = new THREE.Quaternion()
BH.quaternionB = new THREE.Quaternion()
BH.eulerA = new THREE.Euler()

const BH_UTILS = {

  vectorBetweenPoints: function(landmarks, index1, index2, returnVector) {
    const vector1 = landmarks[index1]
    const vector2 = landmarks[index2]

    returnVector.subVectors(vector1, vector2)

    return (returnVector)
  },

  // used for head.
  orientBy4Points: function(el, landmarks, top, bottom, left, right) {

    if (landmarks[top].visibility < VISIBILITY_THRESHOLD) return;
    if (landmarks[bottom].visibility < VISIBILITY_THRESHOLD) return;
    if (landmarks[left].visibility < VISIBILITY_THRESHOLD) return;
    if (landmarks[right].visibility < VISIBILITY_THRESHOLD) return;

    BH_UTILS.vectorBetweenPoints(landmarks, bottom, top, BH.vectorA)
    BH.vectorA.normalize()

    BH_UTILS.vectorBetweenPoints(landmarks, left, right, BH.vectorB)
    BH.vectorB.normalize()

    // get quaternion that makes the y-axis align
    BH.vectorC.set(0, 1, 0)
    BH.quaternionA.setFromUnitVectors(BH.vectorC, BH.vectorA)

    // any further rotation needed to make X axis align?
    BH.vectorC.set(1, 0, 0)
    BH.vectorC.applyQuaternion(BH.quaternionA)

    BH.quaternionB.setFromUnitVectors(BH.vectorC, BH.vectorB)

    el.object3D.quaternion.multiplyQuaternions(BH.quaternionA,
                                               BH.quaternionB)
  },

  // write this for the torso, but it is unused, torso only controlled by
  // shoulders orientation, not hips, and assumed upright.
  orientBy4Corners: function(el, landmarks, tl, tr, bl, br) {

    // First get a vertical.
    BH_UTILS.vectorBetweenPoints(landmarks, bl, tl, BH.vectorA)
    BH_UTILS.vectorBetweenPoints(landmarks, br, tr, BH.vectorB)
    BH.vectorC.addVectors(BH.vectorA, BH.vectorB).normalize()

    // now get a horizontal
    BH_UTILS.vectorBetweenPoints(landmarks, bl, br, BH.vectorA)
    BH_UTILS.vectorBetweenPoints(landmarks, tl, tr, BH.vectorB)
    BH.vectorD.addVectors(BH.vectorA, BH.vectorB).normalize()

    // get quaternion that makes the y-axis align
    BH.vectorA.set(0, 1, 0)
    BH.quaternionA.setFromUnitVectors(BH.vectorA, BH.vectorC)

    // any further rotation needed to make X axis align?
    BH.vectorA.set(1, 0, 0)
    BH.vectorA.applyQuaternion(BH.quaternionA)

    BH.quaternionB.setFromUnitVectors(BH.vectorA, BH.vectorD)

    el.object3D.quaternion.multiplyQuaternions(BH.quaternionA,
                                               BH.quaternionB)
  },

  // orient a component by 2 ponts that are naturally on the Y axis.
  // This accounts for the component having a parent.
  // Illustrated with an example where parent = arm, child = fore-arm
  // and arm is held 90 degrees foreward (zombie-like).
  orientBy2PointsY: function(el, landmarks, top, bottom, parent) {

    // don't act on inaccurate information
    if (landmarks[top].visibility < VISIBILITY_THRESHOLD) return;
    if (landmarks[bottom].visibility < VISIBILITY_THRESHOLD) return;

    if (parent) {
      // get a quatenrnion representing the inverse of the parent's
      // world rotation

      BH.quaternionB.setFromRotationMatrix(parent.object3D.matrixWorld)
      BH.quaternionB.invert()

      // Example: This is the rotation from zombie-arm to arm by side.
    }
    else
    {
      BH.quaternionB.identity()
    }

    BH_UTILS.vectorBetweenPoints(landmarks, top, bottom, BH.vectorB)
    BH.vectorB.normalize()
    BH.vectorB.applyQuaternion(BH.quaternionB)

    // Example: the forearm was a horizontal forwwards vector.
    // this transforms it into a down vector.

    // get quaternion that makes the y axis (top to bottom)
    // as modified by the parent's world rotation, align with the observed
    // orientation.

    BH.vectorA.set(0, -1, 0)
    BH.quaternionA.setFromUnitVectors(BH.vectorA, BH.vectorB)
    // Example: this is a zero transformation.

    // Apply this quaternion to the object.
    el.object3D.quaternion.copy(BH.quaternionA)
  },

  // Orient a component based on 2 points that are naturally on the X axis.
  // does not yet account for parents, so only usable for objects in
  // world space.
  orientBy2PointsX: function(el, landmarks, left, right) {

    // don't act on inaccurate information
    if (landmarks[left].visibility < VISIBILITY_THRESHOLD) return;
    if (landmarks[right].visibility < VISIBILITY_THRESHOLD) return;


    BH_UTILS.vectorBetweenPoints(landmarks, left, right, BH.vectorB)
    BH.vectorB.normalize()

    // get quaternion that makes the x axis (left to right)
    // align with the observed orientation
    BH.vectorA.set(-1, 0, 0)
    el.object3D.quaternion.setFromUnitVectors(BH.vectorA, BH.vectorB)
  }
}

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

  onResults: function(results) {

    this.results = results

    if (this.results.multiFaceLandmarks[0]) {

      const landmarks = this.results.multiFaceLandmarks[0]

      BH_UTILS.vectorBetweenPoints(landmarks, LANDMARK_BOTTOM, LANDMARK_TOP, this.faceYAxis)
      this.faceYLength = this.faceYAxis.length()
      this.faceYAxis.normalize()

      BH_UTILS.vectorBetweenPoints(landmarks, LANDMARK_LEFT, LANDMARK_RIGHT, this.faceXAxis)
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

      BH_UTILS.orientBy4Points(this.el,
                               landmarks,
                               LANDMARK_TOP,
                               LANDMARK_BOTTOM,
                               LANDMARK_LEFT,
                               LANDMARK_RIGHT)
    }
  },

  // to be retired.  Stil used by face animations...
  vectorBetweenPoints: function(index1, index2, returnVector) {
    const vector1 = this.results.multiFaceLandmarks[0][index1]
    const vector2 = this.results.multiFaceLandmarks[0][index2]

    returnVector.subVectors(vector1, vector2)

    return (returnVector)
  },


  animateMouth: function() {

    let height = this.vectorBetweenPoints(LANDMARK_MOUTH_TOP,
                                          LANDMARK_MOUTH_BOTTOM,
                                          this.vectorA).length()
    height = height / this.faceYLength

    let width = this.vectorBetweenPoints(LANDMARK_MOUTH_LEFT,
                                         LANDMARK_MOUTH_RIGHT,
                                         this.vectorA).length()
    width = width / this.faceXLength

    // apply scale factors to mouth (but with adjustments)
    this.mouth.object3D.scale.y = height - 0.06
    this.mouth.object3D.scale.x = width * 2 - 0.55
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

// a net for a rectangle has the following components L-R
// lower layer: left, front, right, back
// top layer (in middle): top, bottom
AFRAME.registerComponent('skin16-net', {
  schema: {
    bottomleft: {type: 'array', default: [0, 12]},
    height: {type: 'number'},
    width: {type: 'number'},
    depth: {type: 'number'}
  },

  init() {
    const units = 16
    const x = Number(this.data.bottomleft[0])
    const y = Number(this.data.bottomleft[1])
    const height = this.data.height
    const width = this.data.width
    const depth = this.data.depth
    const left = [x, y, x + depth, y + height]
    const front = [left[2], left[1], left[2] + width, left[1] + height]
    const right = [front[2], front[1], front[2] + depth, front[1] + height]
    const back = [right[2], right[1], right[2] + width, right[1] + height]
    const top = [left[2], left[3], left[2] + width, left[3] + depth]
    const bottom = [front[2], front[3], front[2] + width, front[3] + depth]


    this.el.setAttribute('box-uvs',
                         {front: front.map(a => a/units),
                          back: back.map(a => a/units),
                          top: top.map(a => a/units),
                          bottom: bottom.map(a => a/units),
                          left: left.map(a => a/units),
                          right: right.map(a => a/units)});
  }
});


AFRAME.registerComponent('box-uvs', {

  // 4 values in each array are:
  //bottom left x, y, top left x, y.
  schema: {
    front: {type: 'array', default: [0, 0, 1, 1]},
    back: {type: 'array', default: [0, 0, 1, 1]},
    top: {type: 'array', default: [0, 0, 1, 1]},
    bottom: {type: 'array', default: [0, 0, 1, 1]},
    left: {type: 'array', default: [0, 0, 1, 1]},
    right: {type: 'array', default: [0, 0, 1, 1]}
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

    this.el.emit("pixel-material-loaded")
  }
});


AFRAME.registerComponent('share-material', {
  schema: {
    ref: { type: 'selector'}
  },

  init() {
  },
  update () {
    // we need the reference's material to be initialized first
    const mesh = this.data.ref.getObject3D('mesh')

    if (!mesh) {
        this.data.ref.addEventListener('pixel-material-loaded', e => {
        this.update.call(this, this.data)
        })
        return;
    }

    const material = this.data.ref.getObject3D('mesh').material
    this.el.getObject3D('mesh').material = material
  }
});

AFRAME.registerComponent('pose', {
  schema: {
    side: {type: 'string'} // "left" or "right"
  },

  init: function() {
    this.rArmVector = new THREE.Vector3()

    // used for working
    this.vectorA = new THREE.Vector3(0, 0, 0)
    this.vectorB = new THREE.Vector3(0, 0, 0)
    this.quaternionA = new THREE.Quaternion()
    this.quaternionB = new THREE.Quaternion()

    // locate body parts.
    this.rArm = document.querySelector("#right-arm-rotator")
    this.lArm = document.querySelector("#left-arm-rotator")
    this.rForearm = document.querySelector("#right-forearm-rotator")
    this.lForearm = document.querySelector("#left-forearm-rotator")
    this.body = document.querySelector("#body")

    //this.tick = AFRAME.utils.throttleTick(this.tick, 500, this);
    this.videoElement = document.getElementsByClassName('input_video')[0];

    this.pose = new Pose({locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
    }});
    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    this.onResults = this.onResults.bind(this);
    this.pose.onResults(this.onResults);

    this.camera = new Camera(this.videoElement, {
      onFrame: async () => {
        await this.pose.send({image: this.videoElement});
      },
      //width: 1280,
      //height: 720
    });
    this.camera.start();
  },

  vectorBetweenPoints: function(index1, index2, returnVector) {
    const vector1 = this.results.poseLandmarks[index1]
    const vector2 = this.results.poseLandmarks[index2]

    returnVector.subVectors(vector1, vector2)

    return (returnVector)
  },

  onResults: function(results) {

    this.results = results

    if (this.results.poseLandmarks) {

      landmarks = this.results.poseLandmarks

      // cross over L & R from Google model, since we want the avatar to reflect
      // our movements.
      const LANDMARK_L_HIP = 24
      const LANDMARK_R_HIP = 23
      const LANDMARK_L_SHOULDER = 12
      const LANDMARK_L_ELBOW = 14
      const LANDMARK_L_WRIST = 16
      const LANDMARK_R_SHOULDER = 11
      const LANDMARK_R_ELBOW = 13
      const LANDMARK_R_WRIST = 15

      // left arm
      BH_UTILS.orientBy2PointsY(this.lArm,
                               landmarks,
                               LANDMARK_L_SHOULDER,
                               LANDMARK_L_ELBOW,
                               this.body)

      BH_UTILS.orientBy2PointsY(this.lForearm,
                                landmarks,
                                LANDMARK_L_ELBOW,
                                LANDMARK_L_WRIST,
                                this.lArm)

      // right arm
      BH_UTILS.orientBy2PointsY(this.rArm,
                               landmarks,
                               LANDMARK_R_SHOULDER,
                               LANDMARK_R_ELBOW,
                               this.body)

      BH_UTILS.orientBy2PointsY(this.rForearm,
                                landmarks,
                                LANDMARK_R_ELBOW,
                                LANDMARK_R_WRIST,
                                this.rArm)

      // torso (body)
      BH_UTILS.orientBy2PointsX(this.body,
                                landmarks,
                                LANDMARK_L_SHOULDER,
                                LANDMARK_R_SHOULDER)
    }
  },
});
