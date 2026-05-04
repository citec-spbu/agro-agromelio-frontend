import { boot } from "quasar/wrappers";
import { userStore } from "src/usage";

// adding global error handling to vue

export default boot(({ app }) => {
    app.config.errorHandler = (err, instance, info) => {
        // handle error, e.g. report to a service
        console.log(err);
        userStore.setError(err);
    };
});
