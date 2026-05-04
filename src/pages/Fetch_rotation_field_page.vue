<template>
    <q-page padding class="legacy-form-page">
    <q-card v-show="cropData" class="legacy-form-card q-pa-md">
        <q-card class="q-mb-md" flat bordered>
            <q-card-section>
                <div><strong>{{ fieldName }}</strong></div>
            </q-card-section>
        </q-card>
        <q-select v-model="computedCropId" :options="crops" option-label="label" option-value="value"
            label="Идентификатор культуры"></q-select>
        <q-input v-model="cropData.startDate" label="Дата начала (DD-MM-YYYY)" hint="Format: DD-MM-YYYY"
            mask="##-##-####"></q-input>
        <q-input v-model="cropData.endDate" label="Дата окончания (DD-MM-YYYY)" hint="Format: DD-MM-YYYY"
            mask="##-##-####"></q-input>
        <q-input v-model="cropData.description" label="Описание"></q-input>

        <q-btn label="Готово" color="primary" @click="submitData" :disabled="isSubmitDisabled"></q-btn>
    </q-card>
    </q-page>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { userStore } from 'src/usage';
import { useQuasar } from 'quasar';
import { useRoute, useRouter } from 'vue-router';


export default {
    name: 'FetchRotationPage',
    setup() {

        const router = useRouter();
        const route = useRoute();
        const $q = useQuasar();

        const cropData = ref({
            fieldId: '',
            startDate: '',
            endDate: '',
            description: ''
        });

        const fieldName = ref(null);

        const crops = ref([]);


        const accessToken = userStore.state.access_token;
        const cropRotationId = route.query.id;

        onMounted(() => {
            fetchFields();
            fetchCrops();
        });
        //get crop data
        async function fetchFields() {
            try {
                const response = await axios.get(`${process.env.VUE_APP_BASE_URL}/api/fields/crop-rotations?id=${cropRotationId}`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                const cultureData = response.data;
                console.log(cultureData);
                fieldName.value = cultureData.field.name;
                cropData.value.fieldId = cultureData.field.id;
                cropData.value.startDate = cultureData.startDate;
                cropData.value.endDate = cultureData.endDate;
                cropData.value.description = cultureData.description;
            } catch (error) {
                console.error('Error fetching fields:', error);
            }
        };
        //crops menu
        async function fetchCrops() {
            try {
                const response = await axios.get(`${process.env.VUE_APP_BASE_URL}/api/fields-service/crops?page=0&size=5000&name=`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                crops.value = response.data.map(crop => ({ label: crop.name, value: crop.id }));
            } catch (error) {
                console.error('Error fetching crops:', error);
            }
        };

        //get cropId
        const computedCropId = computed({
            get: () => cropData.value.cropId,
            set: (value) => {
                cropData.value.cropId = crops.value.find(crop => crop.value === value) || value;;
            }
        });
        //check time
        const isValidDate = (dateStr) => {
            const regex = /^\d{2}-\d{2}-\d{4}$/;
            if (!regex.test(dateStr)) return false;

            const [day, month, year] = dateStr.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
        };

        const isSubmitDisabled = computed(() => {
            return !cropData.value.fieldId || !cropData.value.cropId || !cropData.value.startDate || !cropData.value.endDate || !cropData.value.description;
        })

        const submitData = () => {
            //check jwt
            if (!accessToken) {
                console.error('Нет доступного токена доступа');
                $q.notify({
                    type: 'negative',
                    message: 'Залогиньтесь, пожалуйста'
                })
                return;
            };

            if (!isValidDate(cropData.value.startDate)) {
                $q.notify({
                    color: 'red-5',
                    textColor: 'white',
                    icon: 'warning',
                    message: 'Неверный формат даты. Пожалуйста, используйте дд-мм-гггг.'
                });
                return;
            };

            if (!isValidDate(cropData.value.endDate)) {
                $q.notify({
                    color: 'red-5',
                    textColor: 'white',
                    icon: 'warning',
                    message: 'Неверный формат даты. Пожалуйста, используйте дд-мм-гггг.'
                });
                return;
            };

            const submissionData = {
                fieldId: cropData.value.fieldId,
                cropId: cropData.value.cropId.value,
                startDate: cropData.value.startDate,
                endDate: cropData.value.endDate,
                description: cropData.value.description
            };

            console.log('Submitting data:', JSON.stringify(submissionData));
            axios.put(`${process.env.VUE_APP_BASE_URL}/api/fields/crop-rotations?cropRotationId=${cropRotationId}`, submissionData, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            })
                .then(response => {
                    console.log(response);
                    const selectedCrop = crops.value.find(c => c.value === cropData.value.cropId.value);

                    if (selectedCrop) {
                        computedCropId.value = selectedCrop;
                    }

                    $q.notify({
                        color: 'green-5',
                        textColor: 'white',
                        icon: 'check',
                        message: 'Изменение успешно.'
                    });
                    router.push(`/field_information?fieldId=${submissionData.fieldId}`)
                })
                .catch(error => {
                    if (error.response && error.response.status === 500) {
                    $q.notify({
                    type: 'negative',
                    message: 'Неизвестная ошибка'
                   })
                }
                    console.error(error);
                })
        };

        return {
            computedCropId,
            isSubmitDisabled,
            submitData,
            fetchCrops,
            fetchFields,
            fieldName,
            cropData,
            crops
        }
    }
}

</script>

<style scoped>
.legacy-form-page {
  display: flex;
  justify-content: center;
}

.legacy-form-card {
  width: min(760px, 100%);
}
</style>