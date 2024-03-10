'use strict';
// not completed yet

// we'll use hosted version of leaflet library for hosting map
// we will be using class logic for this project, you can refer diag from 'Project Architecture'

// let map, mapEvent; // declaring global so can be used anywhere accordingly // now declared private🙂

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10); // creating a unique id
  clicks = 0;
  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, long]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }
  _setDescription() {
    // prettier-ignore is used to tell prettier that don't use formatting on the next line
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`; // slice(1) means rest part starting from index 1
  }
  click() {
    this.clicks++;
  }
}

// child classes
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    // this.type = 'cycling';
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);

///////////////////////////////////////////////
// APPLICATION ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map; // declaring private fields
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  constructor() {
    // Get user's position
    this._getPosition(); // we want as soon as the obj is created, page loads & displays map

    // Get data from local storage
    this._getLocalStorage();
    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this)); // this keyword here would be pointing to? bec this
    //  is an event handler function & event handler func always has this kwyeord of DOM element onto which
    // it is attached (in this case, it is to form) & no longer to the app object & we need to fix that, thus added bind(that)
    // so most of the time in constructors, when u are using event handlers, u need to manually use bind keyword, otherwise at many places, code might crash

    // adding event listeners to constructor
    // we want marker to be placed when we submit details

    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    // using geolocation api
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        // takes 2 callback function, first is the callback function that would be called on success, & second is error callback, but now they are refactored (one went to load map)
        this._loadMap.bind(this), // bind wala this is pointing to current object & we also want that in loadmap
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    // console.log(position); // it will print entire geolocation object
    // const latitude = position.coords.latitude;
    // instead of this, we'll use structuring
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(latitude, longitude);
    console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];
    // below code copied from leaflet overview section
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel); // L.map('map'), here 'map' is the id specified in html section at the end

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      // changed the styling using fr/hot (initially, it was different)
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this)); // this on method is coming from leaflet library & is used for adding event listener to a particular position
    // in above, this._showForm's this will be set to obj on which event handler is attached, & is simply the map itself
    // so if kept as it is, this.#mapEvent = mapE; would meanhing mapEvent on map, thus soln is to bind the this keyword, so that this points to app obj

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }
  _showForm(mapE) {
    // when click happens, we want to show the form
    this.#mapEvent = mapE;
    form.classList.remove('hidden'); // we want whenever we click on the map, information is displayed
    inputDistance.focus(); // we want that cursor keeps blinking in distance field
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    // we need to toggle hidden class in Elev gain & cadence
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden'); //selecting the closest parent for that form row
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp)); // ...inputs means it can take arbitrary number of inputs

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault(); // to prevent defualt behaviour of reloading

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value; // + added to convert it into number
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    // Check if data is valid

    // If activity runnning, then create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)   // instead we're using validInputs func
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // if activity cycling, then create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);
    console.log(workout);

    // Render workout on Map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + Clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }
  _renderWorkoutMarker(workout) {
    // Display marker
    //  console.log(this.#mapEvent);

    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false, // thses attributes are selected bec we don't want that pop up of one to be close when other pop up is clicked
          closeOnClick: false,
          className: `${workout.type}-popup`, // since we want styling also
        }) // in bindPopup, not necessary to pass only strings, we can create a pop up like this also ( done by referring documentation )
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
      `;

    if (workout.type === 'running')
      html += `
      <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>
      `;

    if (workout.type === 'cycling')
      html += `
    <div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${workout.speed.toFixed(1)}</span>
    <span class="workout__unit">km/h</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">⛰</span>
    <span class="workout__value">${workout.elevationGain}</span>
    <span class="workout__unit">m</span>
  </div>
</li>
    `;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout'); // looking for closest workout parent
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    console.log(workout);
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      // method available in leaflet library
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the public interface
    workout.click();
  }

  _setLocalStorage() {
    // should not be used to store latge amounts of data
    localStorage.setItem('workouts', JSON.stringify(this.#workouts)); // stringify used to convert any obj in js to string
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }
}

const app = new App();
