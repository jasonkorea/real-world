export default class User {
    constructor() {
        this.displayName = '';
        this.firstName = '';
        this.lastName = '';
        this.email = '';
        this.googleId = '';
        this.image = '';
        this.createdAt = new Date();
    }

    setUserInfo(displayName, firstName, lastName, email, googleId, image, createdAt = new Date()) {
        this.displayName = displayName;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.googleId = googleId;
        this.image = image;
        this.createdAt = createdAt;
    }

    getFullName() {
        return `${this.firstName} ${this.lastName}`;
    }

    getProfileInfo() {
        return {
            displayName: this.displayName,
            fullName: this.getFullName(),
            email: this.email,
            image: this.image,
            createdAt: this.createdAt,
            googleId: this.googleId
        };
    }
}