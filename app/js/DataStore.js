const Store = require('electron-store');

class DataStore extends Store {
	constructor (settings) {
		// same as new Store(settings)
		super(settings)
		
		this.favorites = this.get('favorites') || [];
	}
	
	saveFavorites() {
		// save favorites to JSON file
		this.set('favorites', this.favorites);
		
		// returning 'this' allows method chaining
		return this;
	}
	
	getFavorites() {
		// set object's favorites to favorites in JSON file
		this.favorites = this.get('favorites') || [];
		
		return this;
	}
	
	addFavorite(favorite) {
		this.favorites = [ ...this.favorites, favorite ];
		
		return this.saveFavorites();
	}
	
	deleteFavorite(favorite) {
		// filter out the target favorite
		this.favorites = this.favorites.filter(f => f !== favorite);
		
		return this.saveFavorites();
	}
	
	updateFavorite(num, favorite) {
		let fav = this.favorites.findIndex(f => f.number == num);
		
		console.log("Favorites: ", this.favorites);
		console.log("Fav index: ", fav);
		
		this.favorites[fav] = favorite;
		
		return this.saveFavorites();
	}
	
	clearFavorites() {
		this.favorites = [];
		
		return this.saveFavorites();
	}
}

module.exports = DataStore;