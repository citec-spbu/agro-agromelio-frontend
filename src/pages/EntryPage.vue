<template>
  <div class="my-component">
    <q-layout view="hHh lpR fFf">
        <q-header elevated reveal>
            <q-toolbar style="background-color: white;">
                <q-toolbar-title style="color:#222C3C; font-family:Montserrat; font-weight:light;"
                    class="gt-xs q-ml-lg text-h5">
                    Agromelio
                </q-toolbar-title>
                <q-space></q-space>
                <q-btn :to="{ name: 'login' }" padding="2px 25px" text-color="primary" rounded
                    class="my__btn q-my-auto q-mx-lg" size="lg">
                    Войти
                </q-btn>
            </q-toolbar>
        </q-header>

        <q-page-container>
            <q-page>
                <q-card>
                    <q-card-section horizontal>
                        <q-img class="col-12 my-image" src="~assets/onemoretractor1.jpg">
                        </q-img>
                        <div
                            class="absolute-center text-uppercase text-weight-bold text-h3 text-white col-8 text-center topic">
                            Система управления и анализа агробизнеса
                        </div>
                        <div class="absolute-bottom text-center">
                            <q-btn :to="{ name: 'reg' }" size="xl" color="white" text-color="primary" rounded push
                                padding="5px 30px" style="bottom: 10vh; font-weight:500;">Зарегистрироваться</q-btn>
                        </div>
                        <div>

                        </div>

                    </q-card-section>
                </q-card>

                <div class="register-text text-center col-12 text-h3 text-weight-medium"
                    style="font-family: Montserrat; font-weight: medium; padding-top:10vh; padding-bottom: 5vh;">Кому будет
                    полезно
                </div>

                <div>
                    <q-intersection transition="fade" transition-duration="1500" once>
                        <q-card class="row" flat style="background-color: rgba(247, 247, 247, 0.684);">
                            <q-card-section class=" col-12 col-md-3" style="padding-top: 5vh;">
                                <q-icon name="fa-solid fa-tractor" size="5rem"></q-icon>
                                <div class="text-center text-h5" style="padding-top: 5vh; font-family: Montserrat;">Фермерам
                                </div>
                                <div class="text-center "
                                    style="padding-top: 3vh; font-family:Montserrat; font-weight: 400;">
                                    Планируйте и управляйте процессами сельского хозяйства на основе данных о почве и
                                    погоде.
                                </div>
                            </q-card-section>

                            <q-card-section class="col-12 col-md-3" style="padding-top: 5vh;">
                                <q-icon name="o_business" size="5rem"></q-icon>
                                <div class="text-center text-h5" style="padding-top: 5vh; font-family: Montserrat;">
                                    Агрохолдингам</div>
                                <div class="text-center "
                                    style="padding-top: 3vh; font-family:Montserrat; font-weight: 400;">
                                    Автоматизируйте операции управления полями. Оптимизируйте ресурсы и контроль.
                                </div>
                            </q-card-section>

                            <q-card-section class="col-12 col-md-3" style="padding-top: 5vh;">
                                <q-icon name="o_spa" size="5rem"></q-icon>
                                <div class="text-center text-h5" style="padding-top: 5vh; font-family: Montserrat;">
                                    Агрономам</div>
                                <div class="text-center "
                                    style="padding-top: 3vh; font-family:Montserrat; font-weight: 400;">
                                    Отслеживайте и анализуйте параметры почвы, погоды и урожайности.
                                </div>
                            </q-card-section>

                            <q-card-section class="col-12 col-md-3" style="padding-top: 5vh;">
                                <q-icon name="fa-solid fa-chalkboard" size="5rem"></q-icon>
                                <div class="text-center text-h5 col-12" style="padding-top: 5vh; font-family: Montserrat;">
                                    Институтам
                                </div>
                                <div class="text-center "
                                    style="padding-top: 3vh; font-family:Montserrat; font-weight: medium;">
                                    Используйте данные для проведения исследований, разработок инноваций и оптимизации
                                    сельскохозяйственных методов.
                                </div>
                            </q-card-section>
                        </q-card>
                    </q-intersection>
                </div>




                <div class="text-center text-weight-medium text-h4"
                    style="font-family: Montserrat; font-weight: medium;  padding-bottom:10vh; padding-top:7vh;">
                    Повышайте доход без дополнительных затрат</div>


                <q-card flat style="font-family: Montserrat; padding-top: 2vh; padding-bottom: 5vh;">
                    <q-card-section class="row">
                        <div class="col-12 col-md-5 q-ml-auto q-my-auto">
                            <div class="text-weight-medium my-text">Анализируйте данные о почве и погоде</div>
                            <div class="q-my-lg text-weight-regular q-mr-lg">Получайте информацию о
                                качестве почвы, климатических
                                условиях
                                и погоде для принятия точных решений относительно посевов и урожайности.</div>
                        </div>
                        <q-img class="col-11 col-md-5 q-mr-auto" src="~assets/soil2.jpg"></q-img>
                    </q-card-section>
                </q-card>


                <q-card
                    style="font-family: Montserrat; background-color: rgba(243, 242, 242, 0.827); padding-top: 5vh; padding-bottom: 5vh;">
                    <q-card-section class="row center">
                        <div class="col-12 col-md-5 q-mr-auto q-my-auto">
                            <div class="text-weight-medium my-text">Управляйте ресурсами и урожайностью</div>
                            <div class="q-my-lg text-weight-regular">Максимизируйте
                                использование ресурсов, управляйте урожайностью и оптимизируйте
                                производственные процессы для улучшения эффективности.</div>
                        </div>
                        <q-img class="col-11 col-md-5 q-mr-lg unic" src="~assets/harvest2.jpg"></q-img>
                    </q-card-section>
                </q-card>


                <q-card flat style="font-family: Montserrat; padding-top: 5vh; padding-bottom: 5vh;">
                    <q-card-section class=" row">
                        <div class="col-12 col-md-5 q-ml-auto q-my-auto">
                            <div class="text-weight-medium my-text">Прогнозируйте и обрабатывайте данные</div>
                            <div class="q-my-lg text-weight-regular q-mr-lg">Прогнозируйте
                                изменения, обрабатывайте собранные данные о посевах и вегетации,
                                чтобы принимать информированные решения в сельском хозяйстве. </div>
                        </div>
                        <q-img class="col-11 col-md-5 q-mr-auto" src="~assets/farm3.jpg"></q-img>
                    </q-card-section>
                </q-card>


                <q-card
                    style="font-family: Montserrat; background-color: rgba(243, 242, 242, 0.827); padding-top: 5vh; padding-bottom: 5vh;">
                    <q-card-section class="row center">
                        <div class="col-12 col-md-5 q-mr-auto q-my-auto">
                            <div class="text-weight-medium my-text">Планируйте сельскохозяйственные операции</div>
                            <div class="q-my-lg text-weight-regular">Сайт
                                предоставляет
                                инструменты для планирования и координации сельскохозяйственных работ на
                                полях. Фермеры могут оценивать предыдущие посевы.</div>
                        </div>
                        <q-img class="col-11 col-md-5 q-mr-lg unic" src="~assets/moretractor.jpg"></q-img>
                    </q-card-section>
                </q-card>

            </q-page>
        </q-page-container>

    </q-layout>
  </div>
</template>

<script>

export default {
}
</script>

<style scoped>




.my__btn {
    font-size: 1rem;
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(8px);
}

.my-image {
    height: 60vh;
}

.topic {
    top: calc(20vh + 50px);
}

.col-md-3 {
    font-size: 15px;
}

.unic {
    margin-left: 0px;
}

.q-my-auto {
    font-size: 17px;
    color: #2a3a53;
}

.my-text {
    font-size: 20px;
    color: #23354f;
}

.q-icon {
    left: 43%;
    color: #2f67d8;
}

.my-component :deep(.q-card) {
    border-radius: 16px;
    border: 1px solid #e5ecf7;
    box-shadow: 0 10px 26px rgba(19, 36, 58, 0.08);
}


@media(min-width:1024px) {

    .center {
        flex-direction: row-reverse;

    }

    .q-my-auto {
        font-size: 20px;
    }

    .my-text {
        font-size: 27px;
    }

    .unic {
        margin-left: 100px;
    }

    .q-icon {
        left: 40%;
    }

    .my-image {
        height: 80vh;
    }

    .topic {
        top: calc(30vh + 50px);
    }
}
</style>
