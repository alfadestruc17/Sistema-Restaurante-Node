// MoneyInput — puntos de miles automáticos en inputs de precio (pesos enteros,
// sin decimales: en COP nadie factura centavos). Vanilla JS sin dependencias
// porque no todas las vistas cargan la clase Utils ni jQuery.
//
// Uso: <input type="text" inputmode="decimal" class="money-input" ...>
// El valor visible siempre lleva puntos ("31.000"); antes de que el formulario
// se envíe (submit nativo o FormData armado dentro de un handler de submit),
// se limpia a dígitos puros para que el backend reciba un número real.

(function () {
    function digitsOnly(str) {
        return (str || '').replace(/\D/g, '');
    }

    function format(digits) {
        return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    function parse(value) {
        const digits = digitsOnly(value);
        return digits ? parseInt(digits, 10) : 0;
    }

    function attach(input) {
        input.addEventListener('input', () => {
            const cursorFromEnd = input.value.length - input.selectionStart;
            const formatted = format(digitsOnly(input.value));
            input.value = formatted;
            const newPos = Math.max(0, formatted.length - cursorFromEnd);
            input.setSelectionRange(newPos, newPos);
        });
    }

    function cleanFormBeforeSubmit(form) {
        form.querySelectorAll('.money-input').forEach(input => {
            input.value = digitsOnly(input.value);
        });
    }

    function init() {
        const moneyInputs = document.querySelectorAll('input.money-input');
        moneyInputs.forEach(attach);

        const forms = new Set();
        moneyInputs.forEach(input => {
            const form = input.closest('form');
            if (form) {
                forms.add(form);
            }
        });
        forms.forEach(form => {
            form.addEventListener('submit', () => cleanFormBeforeSubmit(form));
        });
    }

    document.addEventListener('DOMContentLoaded', init);

    window.MoneyInput = { digitsOnly, format, parse, attach, cleanFormBeforeSubmit };
})();
