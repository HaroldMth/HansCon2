document.addEventListener('DOMContentLoaded', () => {
    const createRoomButton = document.getElementById('createRoomButton');
    if (createRoomButton) {
        createRoomButton.addEventListener('click', () => {
            window.location.href = '/create-room.html';
        });
    }

    const createRoomForm = document.getElementById('createRoomForm');
    if (createRoomForm) {
        createRoomForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const roomName = document.getElementById('roomName').value;
            const roomPassword = document.getElementById('roomPassword').value;

            const response = await fetch('/create-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomName, roomPassword }),
            });

            if (response.ok) {
                alert('Room created!');
                window.location.href = '/';
            }
        });
    }
});
