const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.querySelector('.auth-container');

signUpButton.addEventListener('click', () => {
    container.classList.add("right-panel-active");
});

signInButton.addEventListener('click', () => {
    container.classList.remove("right-panel-active");
});

const signInAction = document.getElementById('signInBtnAction');
const signUpAction = document.getElementById('signUpBtnAction');

const loginSuccess = (e) => {
    e.preventDefault();
    localStorage.setItem('isAuthenticated', 'true');
    window.location.href = 'index.html';
};

signInAction.addEventListener('click', loginSuccess);
signUpAction.addEventListener('click', loginSuccess);

if (localStorage.getItem('isAuthenticated') === 'true') {
    window.location.href = 'index.html';
}
