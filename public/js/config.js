export default function visibilitychange(callback) {
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            console.log('visibilitychange : hidden');
            callback("hidden");
        } else {
            console.log('visibilitychange : visible');
            callback("visible");
        }
    });
}