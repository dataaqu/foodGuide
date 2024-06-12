"use strict";

function capitalizeWords(inputString) {
  let words = inputString.split(" ");
  let capitalizedWords = words.map(
    (word) => word.charAt(0).toUpperCase() + word.slice(1)
  );
  let capitalizedString = capitalizedWords.join(" ");
  return capitalizedString;
}

class Food {
  date = new Date();
  id = (Date.now() + "").slice(-10);
  clicks = 0;

  constructor(coords, name, dish) {
    this.coords = coords; // [lat, lng]
    this.name = name; // in km
    this.dish = dish; // in min
  }

  _setDescription() {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    this.description = `${capitalizeWords(this.type)} "${capitalizeWords(this.name)}" on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class FastFood extends Food {
  type = "fastfood";

  constructor(coords, name, dish, price) {
    super(coords, name, dish);
    this.price = price;
    this._setDescription();
  }
}

class Restaurant extends Food {
  type = "restaurant";

  constructor(coords, name, dish, elevationGain) {
    super(coords, name, dish);
    this.elevationGain = elevationGain;
    this._setDescription();
  }
}

///////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector(".form");
const containerFoods = document.querySelector(".foods");

const inputType = document.querySelector(".form__input--type");
const inputName = document.querySelector(".form__input--name");
const inputDish = document.querySelector(".form__input--dish");
const inputPrice = document.querySelector(".form__input--price");
const inputElevation = document.querySelector(".form__input--elevation");

const clearbtn = document.querySelector(".delete__btn");

class App {
  #map;
  #mapZoomLevel = 14;
  #mapEvent;
  #foods = [];
  #markers = [];

  constructor() {
    this._getPosition();
    this._getLocalStorage();
    form.addEventListener("submit", this._newFood.bind(this));
    inputType.addEventListener("change", this._toggleElevationField);
    containerFoods.addEventListener("click", this._moveToPopup.bind(this));
    clearbtn.addEventListener("click", this._clearData.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert("Could not get your position");
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);

    L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on("click", this._showForm.bind(this));

    this.#foods.forEach((food) => {
      this._renderFoodMarker(food);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    inputName.focus();
  }

  _hideForm() {
    inputName.value = inputDish.value = inputPrice.value = inputElevation.value = "";
    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputPrice.closest(".form__row").classList.toggle("form__row--hidden");
  }

  _newFood(e) {
    const validInputs = (...inputs) => inputs.every((inp) => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    e.preventDefault();

    const type = inputType.value;
    const name = inputName.value;
    const dish = inputDish.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let food;

    if (type === "fastfood") {
      const price = +inputPrice.value;

      if (!validInputs(price) || !allPositive(price))
        return alert("Inputs have to be positive numbers!");

      food = new FastFood([lat, lng], name, dish, price);
    }

    if (type === "restaurant") {
      const elevation = +inputElevation.value;

      if (!validInputs(elevation) || !allPositive(elevation))
        return alert("Inputs have to be positive numbers!");

      food = new Restaurant([lat, lng], name, dish, elevation);
    }

    this.#foods.push(food);
    this._renderFoodMarker(food);
    this._renderFood(food);
    this._hideForm();
    this._setLocalStorage();
  }

  _renderFoodMarker(food) {
    const marker = L.marker(food.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          closeButton: false,
          autoClose: false,
          closeOnClick: false,
          className: `${food.type}-popup`,
        })
      )
      .setPopupContent(
        `${food.type === "fastfood" ? "🍔" : "🍽️"} ${capitalizeWords(food.type)} ${capitalizeWords(food.name)}`
      )
      .openPopup();

    this.#markers.push(marker);
  }

  _renderFood(food) {
    let html = `
      <li class="food food--${food.type}" data-id="${food.id}">
        <h2 class="food__title">${food.description}</h2>
        <div class="food__details">
          <span class="food__icon">${food.type === "fastfood" ? "🍔" : "🍽️"}</span>
          <span class="food__value">${capitalizeWords(food.name)}</span>
        </div>
    `;

    if (food.type === "fastfood")
      html += `
        <div class="food__details">
          <span class="food__icon">🥪</span>
          <span class="food__value">${capitalizeWords(food.dish)}</span>
        </div>
        <div class="food__details">
          <span class="food__icon">💵</span>
          <span class="food__value">${food.price}</span>
        </div>
      </li>
      `;

    if (food.type === "restaurant")
      html += `
        <div class="food__details">
          <span class="food__icon">🥪</span>
          <span class="food__value">${capitalizeWords(food.dish)}</span>
        </div>
        <div class="food__details">
          <span class="food__icon">💵</span>
          <span class="food__value">${food.elevationGain}</span>
        </div>
      </li>
      `;

    form.insertAdjacentHTML("afterend", html);
  }

  _moveToPopup(e) {
    if (!this.#map) return;

    const foodsEl = e.target.closest(".food");

    if (!foodsEl) return;

    const food = this.#foods.find((food) => food.id === foodsEl.dataset.id);

    this.#map.setView(food.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem("foods", JSON.stringify(this.#foods));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("foods"));

    if (!data) return;

    this.#foods = data;

    this.#foods.forEach((food) => {
      this._renderFood(food);
    });
  }

  _clearData() {
    // Clear local storage
    localStorage.removeItem("foods");
    
    // Clear the foods list
    this.#foods = [];

    // Remove markers from the map
    this.#markers.forEach(marker => this.#map.removeLayer(marker));
    this.#markers = [];

    // Clear the foods list in the UI
    document.querySelectorAll('.food').forEach(foodEl => foodEl.remove());
  }

  reset() {
    localStorage.removeItem("foods");
    location.reload();
  }
}

const app = new App();