import PropTypes from 'prop-types'
import React, { Component } from 'react'

import AppLayout from 'app/AppLayout'
import TextInput from 'components/layout/inputs/TextInput/TextInput'
import PageTitle from 'components/layout/PageTitle/PageTitle'
import Titles from 'components/layout/Titles/Titles'
import ConfirmDialog from 'new_components/ConfirmDialog'
import { Banner } from 'ui-kit'
import { formatLocalTimeDateString } from 'utils/timezone'

import { ReactComponent as DuoSvg } from '../../../icons/ico-duo.svg'

class Desk extends Component {
  constructor(props) {
    super(props)

    this.state = {
      booking: null,
      isDisabledButton: true,
      isUsedToken: false,
      level: '',
      message: 'Saisissez une contremarque',
      token: '',
      openDialog: false,
    }

    this.TOKEN_MAX_LENGTH = 6
    this.VALID_TOKEN_SYNTAX = /[^a-z0-9]/i
    this.BOOKING_ALREADY_USED = 410
    this.BOOKING_IS_CANCELLED = 'booking_cancelled'
    this.tokenInputRef = React.createRef()
  }

  componentDidMount() {
    this.tokenInputRef.current.focus()
  }

  formattedBookingDate = booking =>
    !booking.datetime
      ? 'Permanent'
      : formatLocalTimeDateString(
          booking.datetime,
          booking.venueDepartementCode,
          "dd/MM/yyyy - HH'h'mm"
        )

  firstErrorMessageFromApi = body => Object.keys(body)[0]

  getErrorMessageFromApi = errorResponse => {
    const errorKey = this.firstErrorMessageFromApi(errorResponse.errors)
    return errorResponse.errors[errorKey]
  }

  resetToken = () => {
    this.setState(
      {
        token: '',
        isUsedToken: false,
        isDisabledButton: true,
      },
      () => {
        this.resetTokenField()
      }
    )
  }

  resetTokenField = () => {
    this.tokenInputRef.current.value = ''
    this.tokenInputRef.current.focus()
  }

  validateToken = event => {
    const { getBooking } = this.props
    const inputValue = event.target.value.toUpperCase()
    // QRCODE return a prefix that we want to ignore.
    const token = inputValue.split(':').reverse()[0]

    const { canCheckTheToken, level, message } = this.getStatusFromToken(token)
    this.setState({
      booking: null,
      isDisabledButton: true,
      isUsedToken: false,
      level,
      message,
      token,
    })

    if (canCheckTheToken) {
      getBooking(token)
        .then(booking => {
          this.setState({
            booking,
            isDisabledButton: false,
            message: 'Coupon v??rifi??, cliquez sur "Valider" pour enregistrer',
          })
        })
        .catch(error => {
          const errorMessage = this.getErrorMessageFromApi(error)
          if (error.status === this.BOOKING_ALREADY_USED) {
            this.setState({
              level: '',
              isUsedToken: true,
              isDisabledButton: false,
              message: errorMessage,
            })
            if (error.errors[this.BOOKING_IS_CANCELLED]) {
              this.setState({
                isDisabledButton: true,
              })
            }
          } else {
            this.setState({
              level: 'error',
              message: errorMessage,
            })
          }
        })
    }
  }

  getStatusFromToken = token => {
    if (token === '') {
      return {
        canCheckTheToken: false,
        level: '',
        message: 'Saisissez une contremarque',
      }
    }

    if (token.match(this.VALID_TOKEN_SYNTAX) !== null) {
      return {
        canCheckTheToken: false,
        level: 'error',
        message: 'Caract??res valides : de A ?? Z et de 0 ?? 9',
      }
    }

    if (token.length < this.TOKEN_MAX_LENGTH) {
      return {
        canCheckTheToken: false,
        level: '',
        message: `Caract??res restants : ${
          this.TOKEN_MAX_LENGTH - token.length
        }/${this.TOKEN_MAX_LENGTH}`,
      }
    }

    if (token.length > this.TOKEN_MAX_LENGTH) {
      return {
        canCheckTheToken: false,
        level: 'error',
        message: `La contremarque ne peut pas faire plus de ${this.TOKEN_MAX_LENGTH} caract??res`,
      }
    }

    return {
      canCheckTheToken: true,
      level: '',
      message: 'V??rification...',
    }
  }

  registrationOfToken = token => event => {
    event.preventDefault()
    const { validateBooking } = this.props

    this.setState({
      message: 'Validation en cours...',
    })

    validateBooking(token)
      .then(() => {
        this.setState({
          message: 'Contremarque valid??e !',
        })
        this.resetToken()
      })
      .catch(error => {
        this.setState({
          level: 'error',
          message: this.getErrorMessageFromApi(error),
        })
      })
  }

  invalidationOfToken = token => event => {
    event.preventDefault()
    const { invalidateBooking } = this.props
    this.setState({
      message: 'Invalidation en cours...',
    })

    invalidateBooking(token)
      .then(() => {
        this.setState({
          message: 'Contremarque invalid??e !',
        })
        this.resetToken()
      })
      .catch(error => {
        this.setState({
          level: 'error',
          message: this.getErrorMessageFromApi(error),
        })
      })
    this.setState({ openDialog: false })
  }

  openDeskConfirmDialog = event => {
    event.preventDefault()
    this.setState({ openDialog: true })
  }
  closeDeskConfirmDialog = () => {
    this.setState({ openDialog: false })
  }

  render() {
    const { booking, isDisabledButton, isUsedToken, level, message, token } =
      this.state

    return (
      <AppLayout layoutConfig={{ pageName: 'desk' }}>
        <PageTitle title="Guichet" />
        <Titles title="Guichet" />
        <p className="advice">
          Saisissez les contremarques pr??sent??es par les b??n??ficiaires afin de
          les valider ou de les invalider.
        </p>
        <form>
          <TextInput
            inputRef={this.tokenInputRef}
            label="Contremarque"
            name="token"
            onChange={this.validateToken}
            placeholder="ex : AZE123"
            type="text"
            value={token}
          />

          {booking && (
            <div
              aria-live="polite"
              aria-relevant="all"
              className="booking-summary"
            >
              <div>
                <div className="desk-label">{'Utilisateur : '}</div>
                <div className="desk-value">{booking.userName}</div>
              </div>
              <div>
                <div className="desk-label">{'Offre : '}</div>
                <div className="desk-value">{booking.offerName}</div>
              </div>
              <div>
                <div className="desk-label">{'Date de l???offre : '}</div>
                <div className="desk-value">
                  {this.formattedBookingDate(booking)}
                </div>
              </div>
              {booking.quantity === 2 ? (
                <div>
                  <div className="desk-label">{'Prix : '}</div>
                  <div className="desk-value duo-price">
                    {`${booking.price * 2} ???`}
                    <DuoSvg title="R??servation DUO" />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="desk-label">{'Prix : '}</div>
                  <div className="desk-value">{`${booking.price} ???`}</div>
                </div>
              )}
              {booking.ean13 !== null && (
                <div>
                  <div className="desk-label">{'ISBN : '}</div>
                  <div className="desk-value">{booking.ean13}</div>
                </div>
              )}
            </div>
          )}

          <div className="desk-button">
            {isUsedToken && (
              <button
                className="secondary-button"
                disabled={isDisabledButton}
                onClick={this.openDeskConfirmDialog}
                type="button"
              >
                Invalider la contremarque
              </button>
            )}
            {this.state.openDialog && (
              <ConfirmDialog
                cancelText="Annuler"
                confirmText="Continuer"
                onCancel={this.closeDeskConfirmDialog}
                onConfirm={this.invalidationOfToken(token)}
                title="Voulez-vous vraiment invalider cette contremarque ?"
              >
                <p>
                  Cette contremarque a d??j?? ??t?? valid??e. Si vous l???invalidez, la
                  r??servation ne vous sera pas rembours??e.
                </p>
              </ConfirmDialog>
            )}
            {!isUsedToken && (
              <button
                className="primary-button"
                disabled={isDisabledButton}
                onClick={this.registrationOfToken(token)}
                type="submit"
              >
                Valider la contremarque
              </button>
            )}
          </div>

          <div
            aria-live="assertive"
            aria-relevant="all"
            className={`desk-message ${level}`}
          >
            {message}
          </div>
          <Banner
            href="https://aide.passculture.app/hc/fr/articles/4416062183569--Acteurs-Culturels-Modalit??s-de-retrait-et-CGU"
            linkTitle="En savoir plus"
            type="notification-info"
          >
            <strong>
              N???oubliez pas de v??rifier l???identit?? du b??n??ficiaire avant de
              valider la contremarque.
            </strong>
            {
              ' Les pi??ces d???identit?? doivent imp??rativement ??tre pr??sent??es physiquement. Merci de ne pas accepter les pi??ces d???identit?? au format num??rique.'
            }
          </Banner>
        </form>
      </AppLayout>
    )
  }
}

Desk.propTypes = {
  getBooking: PropTypes.func.isRequired,
  invalidateBooking: PropTypes.func.isRequired,
  validateBooking: PropTypes.func.isRequired,
}

export default Desk
